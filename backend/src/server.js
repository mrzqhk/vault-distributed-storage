import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initDatabase, closeDatabase } from './config/db.js';
import { clusterService } from './services/cluster.service.js';
import apiRouter from './routes/index.js';
import healthRouter from './routes/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// Configure CORS
app.use(cors({
  origin: config.corsOrigin === '*' ? '*' : [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Parse JSON and raw binary / multipart bodies (up to 200MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: () => true, limit: '200mb' }));

// Request logger
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// API routes (support both /api/v1 and /api)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// Fallback convenience root health endpoint
app.use('/health', healthRouter);

// 404 Handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// Initialize DB and start server
let server = null;

export function startServer() {
  try {
    // Initialize SQLite database
    initDatabase();

    // Sync configured storage nodes into SQLite
    clusterService.syncStorageNodes();

    server = app.listen(config.port, () => {
      logger.info(`Vault Coordinator Backend listening on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
      logger.info(`Public API:   http://localhost:${config.port}/api/v1/objects`);
      logger.info(`Environment:  ${config.nodeEnv}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use by another process. Stop the previous process before starting.`);
      } else {
        logger.error('Coordinator server error:', err);
      }
      process.exit(1);
    });

    return server;
  } catch (err) {
    logger.error('Failed to start Vault Backend:', err);
    process.exit(1);
  }
}

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down Vault Backend gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      closeDatabase();
      process.exit(0);
    });
  } else {
    closeDatabase();
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// If executed directly, start the server
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export { app };
export default app;
