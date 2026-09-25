import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app as coordinatorApp } from '../src/server.js';
import { createStorageNodeApp } from '../src/storage-node/server.js';
import { clusterService } from '../src/services/cluster.service.js';
import { initDatabase, getDatabase, closeDatabase } from '../src/config/db.js';
import { calculateSHA256 } from '../src/utils/hash.js';

test('Replication Integration Tests (A, B, C, D)', async (t) => {
  // Setup database
  initDatabase();

  const coordinatorPort = 8100;
  const coordinatorBaseUrl = `http://127.0.0.1:${coordinatorPort}`;

  const nodePorts = {
    'node-1': 9101,
    'node-2': 9102,
    'node-3': 9103
  };

  const testStorageDirs = {
    'node-1': path.resolve('./storage/test-node-1'),
    'node-2': path.resolve('./storage/test-node-2'),
    'node-3': path.resolve('./storage/test-node-3')
  };

  // Ensure test storage directories exist and are clean
  for (const dir of Object.values(testStorageDirs)) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create 3 storage node apps
  const nodeApps = {
    'node-1': createStorageNodeApp({ nodeId: 'node-1', port: nodePorts['node-1'], storagePath: testStorageDirs['node-1'] }),
    'node-2': createStorageNodeApp({ nodeId: 'node-2', port: nodePorts['node-2'], storagePath: testStorageDirs['node-2'] }),
    'node-3': createStorageNodeApp({ nodeId: 'node-3', port: nodePorts['node-3'], storagePath: testStorageDirs['node-3'] })
  };

  // Start 3 storage node HTTP servers
  const nodeServers = {};
  for (const [nodeId, port] of Object.entries(nodePorts)) {
    await new Promise((resolve) => {
      nodeServers[nodeId] = nodeApps[nodeId].listen(port, () => resolve());
    });
  }

  // Configure coordinator to point to our test storage nodes
  clusterService.setNodes([
    { id: 'node-1', url: `http://127.0.0.1:${nodePorts['node-1']}` },
    { id: 'node-2', url: `http://127.0.0.1:${nodePorts['node-2']}` },
    { id: 'node-3', url: `http://127.0.0.1:${nodePorts['node-3']}` }
  ]);

  // Start coordinator HTTP server
  let coordinatorServer;
  await new Promise((resolve) => {
    coordinatorServer = coordinatorApp.listen(coordinatorPort, () => resolve());
  });

  const testContent = Buffer.from('Vault Distributed Object Storage - 3-Way Replication Test Payload!', 'utf8');
  const expectedHash = calculateSHA256(testContent);
  const testKey = `documents/replication-doc-${Date.now()}.txt`;
  let uploadedObjectId = null;

  // Test A: Upload
  await t.test('A. Upload object through coordinator and verify 3 replicas exist', async () => {
    const uploadRes = await fetch(`${coordinatorBaseUrl}/api/v1/objects?key=${encodeURIComponent(testKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Vault-Checksum-SHA256': expectedHash
      },
      body: testContent
    });

    assert.equal(uploadRes.status, 201, 'Upload response status should be 201 Created');
    const uploadData = await uploadRes.json();

    assert.ok(uploadData.object_id, 'Response must have object_id');
    uploadedObjectId = uploadData.object_id;
    assert.equal(uploadData.key, testKey);
    assert.equal(uploadData.size_bytes, testContent.length);
    assert.equal(uploadData.checksum_sha256, expectedHash);
    assert.equal(uploadData.status, 'ACTIVE');
    assert.equal(uploadData.replication_factor, 3);
    assert.equal(uploadData.replica_nodes.length, 3, 'Should replicate to all 3 nodes');

    // Verify directly on each storage node that the replica actually exists
    for (const [nodeId, port] of Object.entries(nodePorts)) {
      const nodeRes = await fetch(`http://127.0.0.1:${port}/objects/${uploadedObjectId}`);
      assert.equal(nodeRes.status, 200, `Storage node ${nodeId} should have the object`);
      const nodeBytes = Buffer.from(await nodeRes.arrayBuffer());
      assert.deepEqual(nodeBytes, testContent, `Bytes on ${nodeId} must match original content`);
      assert.equal(calculateSHA256(nodeBytes), expectedHash);
    }
  });

  // Test A2: Multipart Upload (e.g. curl -F "file=@demo.txt")
  await t.test('A2. Multipart form-data upload accepts POST /api/v1/objects with -F "file=@demo.txt"', async () => {
    const boundary = '----WebKitFormBoundaryVaultTest' + Date.now();
    const demoContent = 'Demo file content for multipart test upload';
    const multipartBody = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="demo.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${demoContent}\r\n` +
      `--${boundary}--\r\n`
    );

    const uploadRes = await fetch(`${coordinatorBaseUrl}/api/v1/objects`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: multipartBody
    });

    assert.equal(uploadRes.status, 201, 'Multipart upload must return 201 Created');
    const data = await uploadRes.json();
    assert.equal(data.key, 'demo.txt');
    assert.equal(data.size_bytes, Buffer.byteLength(demoContent));
    assert.equal(data.replica_nodes.length, 3);
  });

  // Test B: Retrieve
  await t.test('B. Retrieve through coordinator and verify returned data matches original', async () => {
    const getRes = await fetch(`${coordinatorBaseUrl}/api/v1/objects/${uploadedObjectId}`);
    assert.equal(getRes.status, 200, 'Coordinator GET should return 200');

    const receivedHash = getRes.headers.get('x-vault-checksum-sha256');
    assert.equal(receivedHash, expectedHash, 'Checksum header must match');

    const servedBy = getRes.headers.get('x-vault-served-by');
    assert.ok(['node-1', 'node-2', 'node-3'].includes(servedBy), `Served by valid node: ${servedBy}`);

    const retrievedBytes = Buffer.from(await getRes.arrayBuffer());
    assert.deepEqual(retrievedBytes, testContent, 'Retrieved bytes must match original');
  });

  // Test C: Replica metadata
  await t.test('C. Verify SQLite database records replica locations and metadata', async () => {
    const db = getDatabase();

    // 1. Verify objects table
    const objRow = db.prepare('SELECT * FROM objects WHERE object_id = ?').get(uploadedObjectId);
    assert.ok(objRow, 'Object must exist in objects table');
    assert.equal(objRow.key, testKey);
    assert.equal(objRow.size_bytes, testContent.length);
    assert.equal(objRow.replication_factor, 3);
    assert.equal(objRow.status, 'active');

    // 2. Verify replicas table
    const replicaRows = db.prepare('SELECT * FROM replicas WHERE object_id = ?').all(uploadedObjectId);
    assert.equal(replicaRows.length, 3, 'Should have 3 replica records in SQLite');

    const recordedNodeIds = replicaRows.map(r => r.node_id);
    assert.ok(recordedNodeIds.includes('node-1'));
    assert.ok(recordedNodeIds.includes('node-2'));
    assert.ok(recordedNodeIds.includes('node-3'));

    for (const replica of replicaRows) {
      assert.equal(replica.status, 'active');
      assert.equal(replica.size_bytes, testContent.length);
    }

    // 3. Verify canonical checksum
    const checksumRow = db.prepare("SELECT * FROM checksums WHERE object_id = ? AND scope = 'canonical'").get(uploadedObjectId);
    assert.ok(checksumRow, 'Canonical checksum must exist in SQLite');
    assert.equal(checksumRow.value, expectedHash);

    // 4. Verify Coordinator metadata endpoint returns full details
    const metaRes = await fetch(`${coordinatorBaseUrl}/api/v1/objects/${uploadedObjectId}/metadata`);
    assert.equal(metaRes.status, 200);
    const metaData = await metaRes.json();
    assert.equal(metaData.object_id, uploadedObjectId);
    assert.equal(metaData.replicas.length, 3);
  });

  // Test D: Node failure
  await t.test('D. Stop one storage node and verify coordinator automatically retrieves from another replica', async () => {
    // Stop node-1 server
    await new Promise((resolve) => {
      nodeServers['node-1'].close(() => resolve());
    });

    // Verify node-1 is down
    let node1Reachable = true;
    try {
      await fetch(`http://127.0.0.1:${nodePorts['node-1']}/health`);
    } catch {
      node1Reachable = false;
    }
    assert.equal(node1Reachable, false, 'Storage node-1 should now be unreachable');

    // Retrieve through coordinator
    const getResAfterFailure = await fetch(`${coordinatorBaseUrl}/api/v1/objects/${uploadedObjectId}`);
    assert.equal(getResAfterFailure.status, 200, 'Coordinator GET should still succeed after node-1 failure');

    const servedBy = getResAfterFailure.headers.get('x-vault-served-by');
    assert.ok(['node-2', 'node-3'].includes(servedBy), `Failover should serve from node-2 or node-3, got: ${servedBy}`);

    const retrievedBytes = Buffer.from(await getResAfterFailure.arrayBuffer());
    assert.deepEqual(retrievedBytes, testContent, 'Retrieved bytes after failover must match original');
    assert.equal(calculateSHA256(retrievedBytes), expectedHash);
  });

  // Teardown
  await t.test('Clean up servers and test storage', async () => {
    await new Promise((resolve) => coordinatorServer.close(resolve));
    await new Promise((resolve) => nodeServers['node-2'].close(resolve));
    await new Promise((resolve) => nodeServers['node-3'].close(resolve));

    for (const dir of Object.values(testStorageDirs)) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});
