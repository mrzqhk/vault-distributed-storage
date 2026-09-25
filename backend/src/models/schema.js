/**
 * Metadata Database Schema for Vault
 * Source of truth: DATABASE.md
 */

export const SCHEMA_SQL = `
-- Objects table (logical user-facing objects)
CREATE TABLE IF NOT EXISTS objects (
  object_id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'default',
  current_version_id TEXT,
  size_bytes INTEGER DEFAULT 0,
  content_type TEXT,
  replication_factor INTEGER DEFAULT 3,
  status TEXT CHECK(status IN ('active', 'deleting', 'deleted')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE(key, bucket)
);

-- Object versions table (immutable versions for safe concurrent writes and history)
CREATE TABLE IF NOT EXISTS object_versions (
  version_id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  canonical_checksum_id TEXT,
  status TEXT CHECK(status IN ('writing', 'committed', 'superseded', 'deleted')) DEFAULT 'writing',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE
);

-- Storage nodes table (cluster storage nodes)
CREATE TABLE IF NOT EXISTS storage_nodes (
  node_id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL,
  status TEXT CHECK(status IN ('healthy', 'suspected', 'unreachable', 'decommissioned')) DEFAULT 'healthy',
  capacity_bytes INTEGER NOT NULL DEFAULT 0,
  used_bytes INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at DATETIME,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  zone TEXT,
  version TEXT
);

-- Replicas table (mapping of object version to storage node)
CREATE TABLE IF NOT EXISTS replicas (
  replica_id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'active', 'stale', 'corrupt', 'missing', 'deleted')) DEFAULT 'pending',
  checksum_id TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_verified_at DATETIME,
  verification_failures INTEGER DEFAULT 0,
  FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES object_versions(version_id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES storage_nodes(node_id) ON DELETE CASCADE
);

-- Checksums table (canonical and observed checksums for integrity verification)
CREATE TABLE IF NOT EXISTS checksums (
  checksum_id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'sha256',
  value TEXT NOT NULL,
  scope TEXT CHECK(scope IN ('canonical', 'replica_observed')) NOT NULL,
  node_id TEXT,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES object_versions(version_id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES storage_nodes(node_id) ON DELETE SET NULL
);

-- Repair tasks table (queue for self-healing, replication, and rebalancing)
CREATE TABLE IF NOT EXISTS repair_tasks (
  task_id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  task_type TEXT CHECK(task_type IN ('re_replicate', 'verify', 'rebalance', 'delete_orphan')) NOT NULL,
  source_node_id TEXT,
  target_node_id TEXT,
  status TEXT CHECK(status IN ('queued', 'in_progress', 'completed', 'failed')) DEFAULT 'queued',
  reason TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES object_versions(version_id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES storage_nodes(node_id) ON DELETE SET NULL,
  FOREIGN KEY (target_node_id) REFERENCES storage_nodes(node_id) ON DELETE SET NULL
);

-- Node heartbeat log table (append-only heartbeat history for demo & audit)
CREATE TABLE IF NOT EXISTS node_heartbeat_log (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  status_at_time TEXT NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES storage_nodes(node_id) ON DELETE CASCADE
);
`;
