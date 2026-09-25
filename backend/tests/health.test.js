import test from 'node:test';
import assert from 'node:assert/strict';
import { getHealthStatus } from '../src/services/health.service.js';
import { initDatabase, closeDatabase, getDatabase } from '../src/config/db.js';

test('Health Service returns valid ok status and service name', () => {
  const health = getHealthStatus();
  assert.equal(health.status, 'ok');
  assert.equal(health.service, 'vault-backend');
});

test('SQLite Database initializes all expected schema tables from DATABASE.md', () => {
  const db = initDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const tableNames = tables.map(t => t.name);

  const expectedTables = [
    'objects',
    'object_versions',
    'storage_nodes',
    'replicas',
    'checksums',
    'repair_tasks',
    'node_heartbeat_log'
  ];

  for (const table of expectedTables) {
    assert.ok(tableNames.includes(table), `Table ${table} should exist in database`);
  }

  closeDatabase();
});
