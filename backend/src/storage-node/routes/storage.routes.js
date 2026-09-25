import { Router } from 'express';
import { storageService as defaultStorageService } from '../services/storage.service.js';
import { nodeConfig } from '../config/nodeConfig.js';

/**
 * Helper to ensure raw body buffer is extracted from request
 */
async function extractRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body);
  }
  // Stream collection fallback if body parser didn't run
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Factory to create router with custom service and nodeId
 */
export function createStorageRouter(service = defaultStorageService, nodeId = nodeConfig.nodeId) {
  const router = Router();

  /**
   * PUT /objects/:objectId
   * Store local object data, compute SHA-256, and save metadata
   */
  router.put('/:objectId', async (req, res, next) => {
    try {
      const { objectId } = req.params;
      const expectedChecksum = req.headers['x-vault-checksum-sha256'] ||
                               req.headers['x-checksum-sha256'] ||
                               req.headers['etag']?.replace(/"/g, '') ||
                               null;

      const buffer = await extractRawBody(req);
      const metadata = await service.putObject(objectId, buffer, expectedChecksum);

      res.setHeader('ETag', `"${metadata.checksum_sha256}"`);
      res.setHeader('X-Vault-Checksum-SHA256', metadata.checksum_sha256);
      res.setHeader('X-Vault-Served-By', nodeId);

      return res.status(201).json({
        success: true,
        message: 'Object stored successfully',
        object_id: metadata.object_id,
        objectId: metadata.objectId,
        size: metadata.size,
        size_bytes: metadata.size_bytes,
        checksum: metadata.checksum,
        checksum_sha256: metadata.checksum_sha256,
        created_at: metadata.created_at,
        updated_at: metadata.updated_at
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /objects/:objectId/metadata
   * Retrieve metadata without reading the whole object payload
   */
  router.get('/:objectId/metadata', async (req, res, next) => {
    try {
      const { objectId } = req.params;
      const metadata = await service.getObjectMetadata(objectId);

      if (!metadata) {
        return res.status(404).json({
          error: {
            code: 'OBJECT_NOT_FOUND',
            message: `Object '${objectId}' was not found on node '${nodeId}'`
          }
        });
      }

      res.setHeader('ETag', `"${metadata.checksum_sha256}"`);
      res.setHeader('X-Vault-Checksum-SHA256', metadata.checksum_sha256);
      res.setHeader('X-Vault-Served-By', nodeId);

      return res.status(200).json(metadata);
    } catch (err) {
      next(err);
    }
  });

  /**
   * HEAD /objects/:objectId
   * Return headers with size and SHA-256 checksum
   */
  router.head('/:objectId', async (req, res, next) => {
    try {
      const { objectId } = req.params;
      const metadata = await service.getObjectMetadata(objectId);

      if (!metadata) {
        return res.status(404).end();
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('ETag', `"${metadata.checksum_sha256}"`);
      res.setHeader('X-Vault-Checksum-SHA256', metadata.checksum_sha256);
      res.setHeader('X-Vault-Served-By', nodeId);
      return res.status(200).end();
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /objects/:objectId
   * Retrieve raw object content
   */
  router.get('/:objectId', async (req, res, next) => {
    try {
      const { objectId } = req.params;
      const result = await service.getObject(objectId);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'OBJECT_NOT_FOUND',
            message: `Object '${objectId}' was not found on node '${nodeId}'`
          }
        });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', result.size);
      res.setHeader('ETag', `"${result.checksum}"`);
      res.setHeader('X-Vault-Checksum-SHA256', result.checksum);
      res.setHeader('X-Vault-Served-By', nodeId);
      res.setHeader('X-Vault-Object-Id', objectId);

      return res.status(200).send(result.buffer);
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /objects/:objectId
   * Delete local object and its metadata
   */
  router.delete('/:objectId', async (req, res, next) => {
    try {
      const { objectId } = req.params;
      const deleted = await service.deleteObject(objectId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'OBJECT_NOT_FOUND',
            message: `Object '${objectId}' not found or already deleted on node '${nodeId}'`
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Object deleted successfully',
        object_id: objectId,
        objectId: objectId
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createStorageRouter(defaultStorageService, nodeConfig.nodeId);
