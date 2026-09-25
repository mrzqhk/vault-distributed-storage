import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initDatabase, closeDatabase } from './config/db.js';
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

// Parse JSON bodies
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// API routes
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

    server = app.listen(config.port, () => {
      logger.info(`Vault Coordinator Backend listening on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
      logger.info(`Environment: ${config.nodeEnv}`);
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
