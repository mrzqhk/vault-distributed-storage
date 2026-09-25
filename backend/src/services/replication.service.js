import crypto from 'crypto';
import { getDatabase } from '../config/db.js';
import { config } from '../config/env.js';
import { clusterService } from './cluster.service.js';
import { calculateSHA256 } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

class ReplicationService {
  /**
   * Upload object with replication across storage nodes
   */
  async uploadObject({
    key,
    buffer,
    contentType = 'application/octet-stream',
    replicationFactor = config.defaultReplicationFactor,
    clientChecksum = null,
    bucket = 'default'
  }) {
    if (!buffer || buffer.length === 0) {
      const err = new Error('No file content provided');
      err.statusCode = 400;
      err.code = 'MISSING_FILE';
      throw err;
    }

    if (!key || typeof key !== 'string') {
      const err = new Error('Object key is required');
      err.statusCode = 400;
      err.code = 'INVALID_KEY';
      throw err;
    }

    const db = getDatabase();
    const existingObj = db.prepare('SELECT object_id FROM objects WHERE key = ? AND bucket = ?').get(key, bucket);
    const objectId = existingObj ? existingObj.object_id : crypto.randomUUID();
    const versionId = crypto.randomUUID();

    // 2. Compute SHA-256 checksum
    const checksum = calculateSHA256(buffer);

    // Validate client-supplied checksum if provided
    if (clientChecksum && clientChecksum.toLowerCase() !== checksum.toLowerCase()) {
      const err = new Error(`Checksum mismatch: client supplied ${clientChecksum}, server computed ${checksum}`);
      err.statusCode = 409;
      err.code = 'CHECKSUM_MISMATCH';
      throw err;
    }

    // 3. Select target storage nodes
    clusterService.syncStorageNodes();
    const configuredNodes = clusterService.getNodes();
    const targetCount = Math.min(replicationFactor, configuredNodes.length);
    const targetNodes = configuredNodes.slice(0, targetCount);

    logger.info(`Replicating object '${key}' (${objectId}, ${buffer.length} bytes, SHA256: ${checksum}) to ${targetNodes.length} nodes...`);

    // 4. Send object in parallel to target nodes
    const uploadPromises = targetNodes.map(async (node) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${node.url}/objects/${objectId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'X-Vault-Checksum-SHA256': checksum
          },
          body: buffer,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`Node ${node.id} responded with status ${res.status}`);
        }

        const data = await res.json();
        return {
          node_id: node.id,
          url: node.url,
          success: true,
          data
        };
      } catch (err) {
        logger.warn(`Failed to write replica to ${node.id} (${node.url}):`, err.message);
        return {
          node_id: node.id,
          url: node.url,
          success: false,
          error: err.message
        };
      }
    });

    const writeResults = await Promise.all(uploadPromises);
    const successfulWrites = writeResults.filter(r => r.success);

    // If zero nodes succeeded, fail the write
    if (successfulWrites.length === 0) {
      const err = new Error('Write quorum not met: failed to store replica on any storage node');
      err.statusCode = 503;
      err.code = 'WRITE_QUORUM_NOT_MET';
      err.details = writeResults;
      throw err;
    }

    // 5. Store metadata in SQLite database
    const canonicalChecksumId = crypto.randomUUID();

    const insertObject = db.transaction(() => {
      // Calculate version number
      const latestVersion = db.prepare('SELECT MAX(version_number) as max_v FROM object_versions WHERE object_id = ?').get(objectId);
      const versionNumber = (latestVersion?.max_v || 0) + 1;

      // Upsert into objects table (preserving object_id primary key)
      db.prepare(`
        INSERT INTO objects (
          object_id, key, bucket, current_version_id, size_bytes,
          content_type, replication_factor, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(key, bucket) DO UPDATE SET
          current_version_id = excluded.current_version_id,
          size_bytes = excluded.size_bytes,
          content_type = excluded.content_type,
          status = excluded.status,
          updated_at = datetime('now')
      `).run(
        objectId,
        key,
        bucket,
        versionId,
        buffer.length,
        contentType,
        targetCount,
        'active'
      );

      // Insert into object_versions table
      db.prepare(`
        INSERT INTO object_versions (
          version_id, object_id, version_number, size_bytes,
          canonical_checksum_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'committed', datetime('now'))
      `).run(
        versionId,
        objectId,
        versionNumber,
        buffer.length,
        canonicalChecksumId
      );

      // Insert canonical checksum
      db.prepare(`
        INSERT INTO checksums (
          checksum_id, object_id, version_id, algorithm, value, scope, node_id, computed_at
        ) VALUES (?, ?, ?, 'sha256', ?, 'canonical', NULL, datetime('now'))
      `).run(
        canonicalChecksumId,
        objectId,
        versionId,
        checksum
      );

      // Insert replicas for each target node
      const insertReplica = db.prepare(`
        INSERT INTO replicas (
          replica_id, object_id, version_id, node_id, status,
          checksum_id, size_bytes, created_at, last_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `);

      const insertObservedChecksum = db.prepare(`
        INSERT INTO checksums (
          checksum_id, object_id, version_id, algorithm, value, scope, node_id, computed_at
        ) VALUES (?, ?, ?, 'sha256', ?, 'replica_observed', ?, datetime('now'))
      `);

      for (const res of writeResults) {
        const replicaId = crypto.randomUUID();
        if (res.success) {
          const replicaChecksumId = crypto.randomUUID();
          insertObservedChecksum.run(
            replicaChecksumId,
            objectId,
            versionId,
            checksum,
            res.node_id
          );

          insertReplica.run(
            replicaId,
            objectId,
            versionId,
            res.node_id,
            'active',
            replicaChecksumId,
            buffer.length,
            new Date().toISOString()
          );
        } else {
          insertReplica.run(
            replicaId,
            objectId,
            versionId,
            res.node_id,
            'missing',
            null,
            0,
            null
          );
        }
      }
    });

    insertObject();

    const isFullyReplicated = successfulWrites.length >= targetCount;
    const finalStatus = isFullyReplicated ? 'ACTIVE' : 'DEGRADED';

    logger.info(`Object '${key}' successfully written. Status: ${finalStatus} (${successfulWrites.length}/${targetCount} replicas).`);

    return {
      object_id: objectId,
      objectId,
      key,
      version: 1,
      size_bytes: buffer.length,
      size: buffer.length,
      checksum_sha256: checksum,
      checksum,
      replication_factor: targetCount,
      replica_nodes: successfulWrites.map(w => w.node_id),
      replicaNodes: successfulWrites.map(w => w.node_id),
      status: finalStatus,
      replicas_status: writeResults.map(r => ({
        node_id: r.node_id,
        status: r.success ? 'active' : 'failed',
        error: r.error || null
      })),
      created_at: new Date().toISOString()
    };
  }

  /**
   * Retrieve object bytes with automatic replica failover and checksum verification
   */
  async getObject(objectIdOrKey) {
    const db = getDatabase();

    // 1. Look up object in SQLite
    const object = db.prepare(`
      SELECT * FROM objects 
      WHERE (object_id = ? OR key = ?) AND status != 'deleted'
    `).get(objectIdOrKey, objectIdOrKey);

    if (!object) {
      return null;
    }

    // 2. Fetch canonical checksum
    const canonicalChecksum = db.prepare(`
      SELECT value FROM checksums 
      WHERE object_id = ? AND scope = 'canonical'
      ORDER BY computed_at DESC LIMIT 1
    `).get(object.object_id)?.value;

    // 3. Fetch replicas ordered by healthy/active first
    const replicas = db.prepare(`
      SELECT * FROM replicas 
      WHERE object_id = ? AND status != 'corrupt'
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, last_verified_at DESC
    `).all(object.object_id);

    if (!replicas || replicas.length === 0) {
      const err = new Error(`All replicas for object '${object.object_id}' are missing or corrupt`);
      err.statusCode = 503;
      err.code = 'ALL_REPLICAS_UNAVAILABLE';
      throw err;
    }

    const configuredNodes = clusterService.getNodes();
    let lastError = null;

    // 4. Try candidate replicas in order
    for (const replica of replicas) {
      const node = configuredNodes.find(n => n.id === replica.node_id);
      if (!node) continue;

      try {
        logger.debug(`Attempting read for '${object.object_id}' from replica '${replica.node_id}' (${node.url})...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${node.url}/objects/${object.object_id}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`Node ${replica.node_id} returned HTTP ${res.status}`);
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        // 5. Verify checksum
        const computedChecksum = calculateSHA256(buffer);
        if (canonicalChecksum && computedChecksum !== canonicalChecksum) {
          logger.warn(`Checksum mismatch on replica ${replica.node_id}: expected ${canonicalChecksum}, got ${computedChecksum}`);
          db.prepare("UPDATE replicas SET status = 'corrupt' WHERE replica_id = ?").run(replica.replica_id);
          throw new Error(`Checksum mismatch on replica ${replica.node_id}`);
        }

        // Successfully verified from this replica!
        logger.info(`Successfully served object '${object.key}' (${object.object_id}) from replica '${replica.node_id}'`);

        return {
          buffer,
          object,
          servedByNodeId: replica.node_id,
          checksum: computedChecksum
        };
      } catch (err) {
        lastError = err;
        logger.warn(`Replica on '${replica.node_id}' failed: ${err.message}. Trying next available replica...`);
      }
    }

    const err = new Error(`All replicas failed to retrieve object '${object.object_id}'. Last error: ${lastError?.message || 'unknown'}`);
    err.statusCode = 503;
    err.code = 'ALL_REPLICAS_UNAVAILABLE';
    throw err;
  }

  /**
   * Get metadata and replica details for an object
   */
  async getObjectMetadata(objectIdOrKey) {
    const db = getDatabase();
    const object = db.prepare(`
      SELECT * FROM objects 
      WHERE (object_id = ? OR key = ?) AND status != 'deleted'
    `).get(objectIdOrKey, objectIdOrKey);

    if (!object) {
      return null;
    }

    const canonicalChecksum = db.prepare(`
      SELECT value FROM checksums 
      WHERE object_id = ? AND scope = 'canonical'
      ORDER BY computed_at DESC LIMIT 1
    `).get(object.object_id)?.value;

    const replicas = db.prepare(`
      SELECT replica_id, node_id, status, size_bytes, last_verified_at, created_at
      FROM replicas 
      WHERE object_id = ?
    `).all(object.object_id);

    return {
      object_id: object.object_id,
      objectId: object.object_id,
      key: object.key,
      version: 1,
      size_bytes: object.size_bytes,
      size: object.size_bytes,
      content_type: object.content_type,
      checksum_sha256: canonicalChecksum,
      checksum: canonicalChecksum,
      replication_factor: object.replication_factor,
      status: object.status.toUpperCase(),
      replicas: replicas.map(r => ({
        node_id: r.node_id,
        status: r.status,
        size_bytes: r.size_bytes,
        last_verified_at: r.last_verified_at
      })),
      created_at: object.created_at,
      updated_at: object.updated_at
    };
  }

  /**
   * Soft delete object and instruct replicas to delete data
   */
  async deleteObject(objectIdOrKey) {
    const db = getDatabase();
    const object = db.prepare(`
      SELECT * FROM objects 
      WHERE (object_id = ? OR key = ?) AND status != 'deleted'
    `).get(objectIdOrKey, objectIdOrKey);

    if (!object) {
      return false;
    }

    // Mark as deleted in SQLite
    db.prepare(`
      UPDATE objects 
      SET status = 'deleted', deleted_at = datetime('now')
      WHERE object_id = ?
    `).run(object.object_id);

    // Clean up replicas in parallel (best effort)
    const configuredNodes = clusterService.getNodes();
    for (const node of configuredNodes) {
      fetch(`${node.url}/objects/${object.object_id}`, { method: 'DELETE' }).catch(() => {});
    }

    return true;
  }

  /**
   * List all non-deleted objects
   */
  async listObjects() {
    const db = getDatabase();
    return db.prepare(`
      SELECT object_id, key, bucket, size_bytes, replication_factor, status, created_at, updated_at
      FROM objects 
      WHERE status != 'deleted'
      ORDER BY created_at DESC
    `).all();
  }
}

export const replicationService = new ReplicationService();
