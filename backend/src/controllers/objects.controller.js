import { replicationService } from '../services/replication.service.js';
import { parseMultipart } from '../utils/multipart.js';

export async function uploadObject(req, res, next) {
  try {
    const contentType = req.headers['content-type'] || '';
    let buffer = null;
    let key = req.query.key || req.headers['x-vault-key'] || req.headers['x-key'] || null;
    let replicationFactor = req.query.replication_factor
      ? parseInt(req.query.replication_factor, 10)
      : null;
    let clientChecksum = req.headers['x-vault-checksum-sha256'] ||
                         req.headers['x-checksum-sha256'] ||
                         null;
    let mimeType = 'application/octet-stream';

    // 1. Check if multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const rawBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body || '');
      const parsed = parseMultipart(rawBuffer, contentType);

      if (parsed.fields.key) {
        key = parsed.fields.key;
      }
      if (parsed.fields.replication_factor) {
        replicationFactor = parseInt(parsed.fields.replication_factor, 10);
      }
      if (parsed.fields.checksum_sha256) {
        clientChecksum = parsed.fields.checksum_sha256;
      }

      // Find file part (commonly named 'file' or the first file part found)
      const fileKey = Object.keys(parsed.files)[0];
      if (fileKey && parsed.files[fileKey]) {
        buffer = parsed.files[fileKey].buffer;
        mimeType = parsed.files[fileKey].mimeType;
        if (!key) {
          key = parsed.files[fileKey].filename;
        }
      }
    } else if (contentType.includes('application/json') && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      // 2. Check if JSON payload
      key = req.body.key || key;
      replicationFactor = req.body.replication_factor || replicationFactor;
      clientChecksum = req.body.checksum_sha256 || clientChecksum;
      const content = req.body.content || req.body.data;
      if (content) {
        buffer = Buffer.isBuffer(content)
          ? content
          : Buffer.from(content, typeof content === 'string' && content.startsWith('base64:') ? 'base64' : 'utf8');
      }
    } else if (Buffer.isBuffer(req.body)) {
      // 3. Raw binary buffer
      buffer = req.body;
      mimeType = contentType.split(';')[0].trim() || 'application/octet-stream';
    } else if (typeof req.body === 'string') {
      buffer = Buffer.from(req.body, 'utf8');
    }

    if (!key) {
      key = `object-${Date.now()}`;
    }

    const result = await replicationService.uploadObject({
      key,
      buffer,
      contentType: mimeType,
      replicationFactor: replicationFactor || undefined,
      clientChecksum
    });

    res.setHeader('ETag', `"${result.checksum_sha256}"`);
    res.setHeader('X-Vault-Checksum-SHA256', result.checksum_sha256);

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getObject(req, res, next) {
  try {
    const { objectId } = req.params;
    const result = await replicationService.getObject(objectId);

    if (!result) {
      return res.status(404).json({
        error: {
          code: 'OBJECT_NOT_FOUND',
          message: `Object '${objectId}' not found`
        }
      });
    }

    res.setHeader('Content-Type', result.object.content_type || 'application/octet-stream');
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('X-Vault-Checksum-SHA256', result.checksum);
    res.setHeader('X-Vault-Served-By', result.servedByNodeId);
    res.setHeader('X-Vault-Version', '1');
    res.setHeader('ETag', `"${result.checksum}"`);

    return res.status(200).send(result.buffer);
  } catch (err) {
    next(err);
  }
}

export async function getObjectMetadata(req, res, next) {
  try {
    const { objectId } = req.params;
    const metadata = await replicationService.getObjectMetadata(objectId);

    if (!metadata) {
      return res.status(404).json({
        error: {
          code: 'OBJECT_NOT_FOUND',
          message: `Object '${objectId}' not found`
        }
      });
    }

    return res.status(200).json(metadata);
  } catch (err) {
    next(err);
  }
}

export async function deleteObject(req, res, next) {
  try {
    const { objectId } = req.params;
    const deleted = await replicationService.deleteObject(objectId);

    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'OBJECT_NOT_FOUND',
          message: `Object '${objectId}' not found or already deleted`
        }
      });
    }

    return res.status(202).json({
      object_id: objectId,
      status: 'DELETED',
      deleted_at: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

export async function listObjects(req, res, next) {
  try {
    const objects = await replicationService.listObjects();
    return res.status(200).json({
      objects,
      total: objects.length
    });
  } catch (err) {
    next(err);
  }
}
