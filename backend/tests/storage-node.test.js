import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from '../src/storage-node/server.js';
import { nodeConfig } from '../src/storage-node/config/nodeConfig.js';
import { storageService } from '../src/storage-node/services/storage.service.js';
import { calculateSHA256 } from '../src/storage-node/utils/hash.js';

test('Storage Node Unit & HTTP Integration Tests', async (t) => {
  let server;
  const testPort = 9991;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  await t.test('Storage Node server starts listening', async () => {
    await new Promise((resolve) => {
      server = app.listen(testPort, () => {
        resolve();
      });
    });
    assert.ok(server.listening);
  });

  await t.test('GET /health returns valid node info and storage stats', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'HEALTHY');
    assert.ok(body.node_id || body.nodeId);
    assert.ok(body.port);
    assert.ok(body.storage_path || body.storagePath);
    assert.ok(body.storage);
    assert.equal(typeof body.storage.object_count, 'number');
    assert.equal(typeof body.storage.total_bytes, 'number');
  });

  const testObjectId = `test-obj-${Date.now()}`;
  const testContent = Buffer.from('Hello Vault Distributed Storage Phase 2!', 'utf8');
  const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');

  await t.test('PUT /objects/:objectId stores the object and returns checksum', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Vault-Checksum-SHA256': expectedHash
      },
      body: testContent
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.object_id, testObjectId);
    assert.equal(body.size, testContent.length);
    assert.equal(body.checksum_sha256, expectedHash);
  });

  await t.test('GET /objects/:objectId returns stored bytes and checksum header', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}`);
    assert.equal(res.status, 200);

    const returnedChecksum = res.headers.get('x-vault-checksum-sha256');
    assert.equal(returnedChecksum, expectedHash);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(buffer, testContent);

    // Verify computed hash matches
    const actualHash = calculateSHA256(buffer);
    assert.equal(actualHash, expectedHash);
  });

  await t.test('GET /objects/:objectId/metadata returns metadata JSON', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}/metadata`);
    assert.equal(res.status, 200);

    const meta = await res.json();
    assert.equal(meta.object_id, testObjectId);
    assert.equal(meta.size, testContent.length);
    assert.equal(meta.checksum_sha256, expectedHash);
  });

  await t.test('HEAD /objects/:objectId returns 200 and headers without body', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}`, {
      method: 'HEAD'
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-length'), String(testContent.length));
    assert.equal(res.headers.get('x-vault-checksum-sha256'), expectedHash);
  });

  await t.test('DELETE /objects/:objectId removes the object and metadata', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  await t.test('GET /objects/:objectId returns 404 after deletion', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}`);
    assert.equal(res.status, 404);
  });

  await t.test('GET /objects/:objectId/metadata returns 404 after deletion', async () => {
    const res = await fetch(`${baseUrl}/objects/${testObjectId}/metadata`);
    assert.equal(res.status, 404);
  });

  await t.test('PUT with checksum mismatch fails with 409 CHECKSUM_MISMATCH', async () => {
    const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const res = await fetch(`${baseUrl}/objects/mismatch-test`, {
      method: 'PUT',
      headers: {
        'X-Vault-Checksum-SHA256': wrongHash
      },
      body: Buffer.from('Mismatch content')
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error?.code, 'CHECKSUM_MISMATCH');
  });

  await t.test('Close test server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
