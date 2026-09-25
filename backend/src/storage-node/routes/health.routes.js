import { Router } from 'express';
import { nodeConfig as defaultNodeConfig } from '../config/nodeConfig.js';
import { storageService as defaultStorageService } from '../services/storage.service.js';

export function createHealthRouter(service = defaultStorageService, config = defaultNodeConfig) {
  const router = Router();

  router.get('/', (req, res) => {
    const stats = service.getStorageStats();

    return res.status(200).json({
      status: 'HEALTHY',
      node_id: config.nodeId,
      nodeId: config.nodeId,
      port: config.port,
      storage_path: service.storagePath || config.storagePath,
      storagePath: service.storagePath || config.storagePath,
      coordinator_url: config.coordinatorUrl,
      storage: {
        object_count: stats.object_count,
        total_bytes: stats.total_bytes,
        total_size_formatted: stats.totalBytesFormatted
      },
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

export default createHealthRouter(defaultStorageService, defaultNodeConfig);
