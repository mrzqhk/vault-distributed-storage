import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultNodes = [
  { id: 'node-1', url: process.env.NODE_1_URL || 'http://localhost:9001' },
  { id: 'node-2', url: process.env.NODE_2_URL || 'http://localhost:9002' },
  { id: 'node-3', url: process.env.NODE_3_URL || 'http://localhost:9003' }
];

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  databasePath: process.env.DATABASE_PATH || './data/vault.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  storageNodes: process.env.STORAGE_NODES ? JSON.parse(process.env.STORAGE_NODES) : defaultNodes,
  defaultReplicationFactor: parseInt(process.env.DEFAULT_REPLICATION_FACTOR || '3', 10)
};
