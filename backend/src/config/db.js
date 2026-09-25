import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { SCHEMA_SQL } from '../models/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export function initDatabase() {
  if (db) {
    return db;
  }

  const dbPath = path.isAbsolute(config.databasePath)
    ? config.databasePath
    : path.resolve(__dirname, '../../', config.databasePath);

  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  logger.info(`Opening SQLite database at ${dbPath}`);
  db = new Database(dbPath);

  // Enable foreign key constraints and WAL mode for reliability
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema tables from DATABASE.md
  db.exec(SCHEMA_SQL);
  logger.info('Database schema tables initialized successfully');

  return db;
}

export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}
