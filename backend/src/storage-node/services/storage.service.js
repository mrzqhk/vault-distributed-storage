import fs from 'fs';
import path from 'path';
import { nodeConfig } from '../config/nodeConfig.js';
import { calculateSHA256 } from '../utils/hash.js';
import { logger } from '../../utils/logger.js';

export class StorageService {
  constructor(storagePath = nodeConfig.storagePath, nodeId = nodeConfig.nodeId) {
    this.storagePath = path.isAbsolute(storagePath)
      ? storagePath
      : path.resolve(process.cwd(), storagePath);
    this.nodeId = nodeId;
    this.ensureStorageDir(this.storagePath);
  }

  /**
   * Ensure directory exists
   */
  ensureStorageDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Resolve safe file paths for object data and metadata
   */
  resolvePaths(objectId) {
    if (!objectId || typeof objectId !== 'string') {
      throw new Error('Invalid object ID');
    }

    // Normalize and protect against directory traversal
    const safeName = path.normalize(objectId).replace(/^(\.\.[\/\\])+/, '');
    const dataFilePath = path.resolve(this.storagePath, safeName);

    // Verify it stays inside storagePath
    if (!dataFilePath.startsWith(this.storagePath)) {
      throw new Error('Access denied: path traversal detected');
    }

    const metaFilePath = `${dataFilePath}.meta.json`;
    return { dataFilePath, metaFilePath };
  }

  /**
   * Write an object to disk, compute SHA-256, and store metadata
   */
  async putObject(objectId, buffer, expectedChecksum = null) {
    const { dataFilePath, metaFilePath } = this.resolvePaths(objectId);

    // Ensure parent directory exists
    this.ensureStorageDir(path.dirname(dataFilePath));

    // Calculate SHA-256 checksum
    const checksum = calculateSHA256(buffer);

    // Validate client-supplied checksum if provided
    if (expectedChecksum && expectedChecksum.toLowerCase() !== checksum.toLowerCase()) {
      const err = new Error(`Checksum mismatch: expected ${expectedChecksum}, computed ${checksum}`);
      err.statusCode = 409;
      err.code = 'CHECKSUM_MISMATCH';
      throw err;
    }

    // Check if previous metadata exists to preserve createdAt
    let createdAt = new Date().toISOString();
    if (fs.existsSync(metaFilePath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
        if (prev.created_at || prev.createdAt) {
          createdAt = prev.created_at || prev.createdAt;
        }
      } catch {
        // Ignore read error on old metadata
      }
    }

    // Write binary file
    fs.writeFileSync(dataFilePath, buffer);

    // Write metadata
    const metadata = {
      object_id: objectId,
      objectId,
      size: buffer.length,
      size_bytes: buffer.length,
      checksum_sha256: checksum,
      checksum,
      created_at: createdAt,
      createdAt,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2), 'utf8');

    logger.info(`[StorageNode:${this.nodeId}] Stored object ${objectId} (${buffer.length} bytes, SHA256: ${checksum})`);

    return metadata;
  }

  /**
   * Retrieve stored object bytes and metadata
   */
  async getObject(objectId) {
    const { dataFilePath, metaFilePath } = this.resolvePaths(objectId);

    if (!fs.existsSync(dataFilePath) || !fs.statSync(dataFilePath).isFile()) {
      return null;
    }

    const buffer = fs.readFileSync(dataFilePath);
    let metadata = null;

    if (fs.existsSync(metaFilePath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
      } catch (e) {
        logger.warn(`Failed to parse metadata file for ${objectId}:`, e.message);
      }
    }

    const checksum = metadata?.checksum_sha256 || calculateSHA256(buffer);

    return {
      buffer,
      size: buffer.length,
      checksum,
      metadata: metadata || {
        object_id: objectId,
        size: buffer.length,
        checksum_sha256: checksum
      }
    };
  }

  /**
   * Retrieve metadata for an object without reading the entire payload
   */
  async getObjectMetadata(objectId) {
    const { dataFilePath, metaFilePath } = this.resolvePaths(objectId);

    if (!fs.existsSync(dataFilePath) || !fs.statSync(dataFilePath).isFile()) {
      return null;
    }

    if (fs.existsSync(metaFilePath)) {
      try {
        return JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
      } catch (e) {
        logger.warn(`Failed to parse metadata for ${objectId}:`, e.message);
      }
    }

    // Fallback: inspect file directly
    const stat = fs.statSync(dataFilePath);
    const buffer = fs.readFileSync(dataFilePath);
    const checksum = calculateSHA256(buffer);

    return {
      object_id: objectId,
      objectId,
      size: stat.size,
      size_bytes: stat.size,
      checksum_sha256: checksum,
      checksum,
      created_at: stat.birthtime.toISOString(),
      updated_at: stat.mtime.toISOString()
    };
  }

  /**
   * Delete an object and its metadata file
   */
  async deleteObject(objectId) {
    const { dataFilePath, metaFilePath } = this.resolvePaths(objectId);

    if (!fs.existsSync(dataFilePath)) {
      return false;
    }

    fs.unlinkSync(dataFilePath);

    if (fs.existsSync(metaFilePath)) {
      try {
        fs.unlinkSync(metaFilePath);
      } catch (e) {
        logger.warn(`Failed to remove metadata file for ${objectId}:`, e.message);
      }
    }

    logger.info(`[StorageNode:${this.nodeId}] Deleted object ${objectId}`);
    return true;
  }

  /**
   * Get basic storage metrics (count of objects, total bytes)
   */
  getStorageStats() {
    this.ensureStorageDir(this.storagePath);

    let objectCount = 0;
    let totalBytes = 0;

    const scanDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            if (!entry.name.endsWith('.meta.json') && !entry.name.endsWith('.tmp')) {
              objectCount += 1;
              const stat = fs.statSync(fullPath);
              totalBytes += stat.size;
            }
          }
        }
      } catch (e) {
        logger.warn('Error reading storage directory stats:', e.message);
      }
    };

    scanDir(this.storagePath);

    return {
      objectCount,
      object_count: objectCount,
      totalBytes,
      total_bytes: totalBytes,
      totalBytesFormatted: `${(totalBytes / 1024).toFixed(2)} KB`
    };
  }
}

export const storageService = new StorageService();
