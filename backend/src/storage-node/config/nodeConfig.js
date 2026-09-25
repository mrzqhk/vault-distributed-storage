import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root if present without overriding existing env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeId = process.env.NODE_ID || 'node-1';
const port = parseInt(process.env.NODE_PORT || process.env.PORT || '9001', 10);
const rawStoragePath = process.env.STORAGE_PATH || `./storage/${nodeId}`;
const storagePath = path.isAbsolute(rawStoragePath)
  ? rawStoragePath
  : path.resolve(process.cwd(), rawStoragePath);

const coordinatorUrl = process.env.COORDINATOR_URL || 'http://localhost:8000';
const corsOrigin = process.env.CORS_ORIGIN || '*';

export const nodeConfig = {
  nodeId,
  port,
  storagePath,
  coordinatorUrl,
  corsOrigin,
  nodeEnv: process.env.NODE_ENV || 'development'
};
