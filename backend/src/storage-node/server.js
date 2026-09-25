import express from 'express';
import cors from 'cors';
import path from 'path';
import { nodeConfig as defaultNodeConfig } from './config/nodeConfig.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createStorageRouter } from './routes/storage.routes.js';
import { StorageService } from './services/storage.service.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export function createStorageNodeApp(options = {}) {
  const nodeId = options.nodeId || defaultNodeConfig.nodeId;
  const port = options.port || defaultNodeConfig.port;
  const storagePath = options.storagePath
    ? (path.isAbsolute(options.storagePath) ? options.storagePath : path.resolve(process.cwd(), options.storagePath))
    : defaultNodeConfig.storagePath;
  const coordinatorUrl = options.coordinatorUrl || defaultNodeConfig.coordinatorUrl;
  const corsOrigin = options.corsOrigin || defaultNodeConfig.corsOrigin;

  const currentConfig = {
    nodeId,
    port,
    storagePath,
    coordinatorUrl,
    corsOrigin
  };

  const service = new StorageService(storagePath, nodeId);
  const app = express();

  // Configure CORS
  app.use(cors({
    origin: corsOrigin === '*' ? '*' : [corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }));

  // Accept raw binary data payloads up to 200MB
  app.use(express.raw({ type: '*/*', limit: '200mb' }));
  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    logger.debug(`[StorageNode:${nodeId}] ${req.method} ${req.url}`);
    next();
  });

  // Health check endpoints
  const healthRouter = createHealthRouter(service, currentConfig);
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);

  // Object storage endpoints (support both /objects and internal replica routes)
  const storageRouter = createStorageRouter(service, nodeId);
  app.use('/objects', storageRouter);
  app.use('/internal/replicas', storageRouter);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

const app = createStorageNodeApp();

let server = null;

export function startServer(port = defaultNodeConfig.port) {
  try {
    server = app.listen(port, () => {
      logger.info(`=======================================================`);
      logger.info(`Vault Storage Node '${defaultNodeConfig.nodeId}' is running!`);
      logger.info(`Port:            ${port}`);
      logger.info(`Storage Path:    ${defaultNodeConfig.storagePath}`);
      logger.info(`Coordinator URL: ${defaultNodeConfig.coordinatorUrl}`);
      logger.info(`Health check:    http://localhost:${port}/health`);
      logger.info(`Objects API:     http://localhost:${port}/objects/:objectId`);
      logger.info(`=======================================================`);
    });

    return server;
  } catch (err) {
    logger.error(`Failed to start Storage Node '${defaultNodeConfig.nodeId}':`, err);
    process.exit(1);
  }
}

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down Storage Node '${defaultNodeConfig.nodeId}'...`);
  if (server) {
    server.close(() => {
      logger.info('Storage Node HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// If executed directly, start the server
if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'))) {
  startServer();
}

export { app };
export default app;
