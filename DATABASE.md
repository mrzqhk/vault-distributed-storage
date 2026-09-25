# Vault — Database & Metadata Model

Owner: Metadata/DB design
Scope: This document defines everything the metadata layer of Vault must store, how it's structured, and how it changes as the system runs. No application code — this is the contract other components (API layer, storage nodes, repair workers) implement against.

---

## 1. What the system needs to store

Vault is a distributed object store, so metadata (not the actual object bytes) is the source of truth for "what exists, where it lives, and whether it's healthy." We need to track:

- **Objects** the user has stored (logical name/key, size, owner, timestamps).
- **Versions** of each object (since overwrites shouldn't destroy history and deletes should be safe).
- **Storage nodes** in the cluster (identity, address, capacity, health).
- **Replicas** — which node holds which version of which object, and in what state.
- **Checksums** — for verifying integrity of an object and of each individual replica.
- **Node health/status** — heartbeats, failure detection, partition awareness.
- **Repair/rebalance tasks** — work items the system queues when replicas are missing, corrupt, or unevenly distributed.

The metadata DB is the **control plane**. Object bytes themselves live on storage nodes (data plane) and are never stored in this database.

---

## 2. Object metadata

An **Object** is the logical entity a user refers to by key (like a filename). It is immutable in identity but mutable in content via new versions.

Fields:
- `object_id` (UUID, PK)
- `key` (string, unique per namespace/bucket) — user-facing name
- `bucket` (string) — logical namespace/grouping, keeps this multi-tenant-ready
- `current_version_id` (UUID, FK → object_versions) — points to the "live" version
- `size_bytes` (int) — size of current version, denormalized for quick reads
- `content_type` (string, nullable)
- `replication_factor` (int) — desired number of replicas, configurable per object or bucket default
- `status` (enum: `active`, `deleting`, `deleted`)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `deleted_at` (timestamp, nullable)

---

## 3. Storage-node metadata

A **StorageNode** represents one physical/virtual node in the cluster that can hold replicas.

Fields:
- `node_id` (UUID, PK)
- `hostname` (string)
- `ip_address` (string)
- `port` (int)
- `status` (enum: `healthy`, `suspected`, `unreachable`, `decommissioned`)
- `capacity_bytes` (int) — total disk capacity
- `used_bytes` (int) — currently used, updated periodically
- `last_heartbeat_at` (timestamp)
- `joined_at` (timestamp)
- `zone` (string, nullable) — rack/AZ label, useful later for placement diversity
- `version` (string) — node software version, useful for debugging

---

## 4. Replica information

A **Replica** is one physical copy of one object version sitting on one node. This is the join table connecting objects, versions, and nodes — the heart of the system.

Fields:
- `replica_id` (UUID, PK)
- `object_id` (UUID, FK → objects)
- `version_id` (UUID, FK → object_versions)
- `node_id` (UUID, FK → storage_nodes)
- `status` (enum: `pending`, `active`, `stale`, `corrupt`, `missing`, `deleted`)
- `checksum_id` (UUID, FK → checksums, nullable) — the checksum recorded when this replica was written
- `size_bytes` (int)
- `created_at` (timestamp)
- `last_verified_at` (timestamp, nullable) — last time integrity was confirmed
- `verification_failures` (int, default 0) — counter, useful for deciding when to quarantine a replica

Notes:
- A replica's `status` is the unit the repair system reasons about: "this object-version needs N `active` replicas; count what exists and queue work for the gap."
- `pending` covers the brief window during upload before a replica is confirmed written and checksummed.

---

## 5. Checksums / integrity information

Checksums are stored separately from replicas so both **the canonical object-level checksum** (what the data *should* hash to) and **per-replica observed checksums** (what a given copy *actually* hashes to) can be compared.

Fields:
- `checksum_id` (UUID, PK)
- `object_id` (UUID, FK → objects)
- `version_id` (UUID, FK → object_versions)
- `algorithm` (string, e.g. `sha256`)
- `value` (string, hex digest)
- `scope` (enum: `canonical`, `replica_observed`) — canonical = recorded at write time as ground truth; replica_observed = recorded during a verification scan of one specific replica
- `node_id` (UUID, FK → storage_nodes, nullable) — set only when `scope = replica_observed`
- `computed_at` (timestamp)

Integrity verification logic: periodically (or on read), recompute a replica's hash and insert a `replica_observed` checksum row, then compare its `value` against the `canonical` checksum for that version. Mismatch → mark the replica `corrupt` and queue a repair task.

---

## 6. Object versions

Every write creates a new **ObjectVersion** rather than mutating data in place. This gives Vault safe concurrent writes, a rollback path, and a clean way to reason about "which replicas belong together."

Fields:
- `version_id` (UUID, PK)
- `object_id` (UUID, FK → objects)
- `version_number` (int, monotonically increasing per object)
- `size_bytes` (int)
- `canonical_checksum_id` (UUID, FK → checksums)
- `status` (enum: `writing`, `committed`, `superseded`, `deleted`)
- `created_at` (timestamp)
- `created_by` (string, client/uploader id — optional for hackathon scope)

Notes:
- `writing` = upload in progress, not yet safe to serve.
- `committed` = enough replicas confirmed written (per replication factor policy), safe to read.
- `superseded` = a newer version now exists; old bytes may be garbage collected later.
- This model gives you **optimistic concurrency for free**: two concurrent uploads to the same key just create two version rows; whichever commits last (or per a defined conflict policy) becomes `current_version_id` on the object.

---

## 7. Node health / status

Rather than a separate table, node health is tracked as fields on `storage_nodes` (Section 3) plus an append-only history log for debugging and partition detection:

**NodeHeartbeatLog** (optional but recommended — cheap and very useful for demos):
- `id` (UUID, PK)
- `node_id` (UUID, FK → storage_nodes)
- `status_at_time` (enum, same as node status)
- `recorded_at` (timestamp)

Status transition logic (implemented by a background monitor, not the DB itself):
- `healthy → suspected`: no heartbeat for > `X` seconds
- `suspected → unreachable`: no heartbeat for > `Y` seconds (Y > X), triggers repair task creation for replicas on that node
- `unreachable → healthy`: heartbeat resumes; triggers a reconciliation check (see Section 13)

---

## 8. Repair / rebalancing information

A **RepairTask** is a queued unit of work: "this object-version needs attention on this node (or needs a new node)."

Fields:
- `task_id` (UUID, PK)
- `object_id` (UUID, FK → objects)
- `version_id` (UUID, FK → object_versions)
- `task_type` (enum: `re_replicate`, `verify`, `rebalance`, `delete_orphan`)
- `source_node_id` (UUID, FK → storage_nodes, nullable) — healthy node to copy *from*
- `target_node_id` (UUID, FK → storage_nodes, nullable) — node to copy *to* (may be chosen at execution time instead of enqueue time)
- `status` (enum: `queued`, `in_progress`, `completed`, `failed`)
- `reason` (string, e.g. `node_unreachable`, `checksum_mismatch`, `underreplicated`, `capacity_skew`)
- `attempts` (int, default 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

`rebalance` tasks (moving a replica from an over-utilized node to an under-utilized healthy node) reuse the same table as repair — same shape of work, different reason.

---

## 9. Relationships between entities

```
buckets (implicit via objects.bucket)
   │
   ▼
objects (1) ───────────< (many) object_versions
   │                              │
   │                              ├──< (many) replicas >──── (1) storage_nodes
   │                              │              │
   │                              │              └──> (1, nullable) checksums (replica_observed)
   │                              │
   │                              └──> (1) checksums (canonical)
   │
   └──< (many) repair_tasks
                  │
                  ├──> (1, nullable) storage_nodes (source)
                  └──> (1, nullable) storage_nodes (target)

storage_nodes (1) ───< (many) node_heartbeat_log
```

Plain-English relationships:
- One **object** has many **versions**; exactly one version is "current."
- One **version** has many **replicas** (one per node holding a copy), and exactly one **canonical checksum**.
- One **replica** lives on exactly one **node** and may have observed-checksum history.
- One **node** hosts many **replicas** across many objects.
- **Repair tasks** reference an object/version and up to two nodes (source/target); they are the queue that keeps replicas ↔ replication_factor in sync.

---

## 10. Recommended database technology (hackathon prototype)

**Recommendation: SQLite (single file), accessed through a lightweight ORM or raw SQL.**

Why:
- **Zero setup.** No server to run, no connection pool to configure — critical when you have hours, not days.
- **Relational fit.** This metadata is inherently relational (objects → versions → replicas → nodes), with clear foreign keys and the need for joins (e.g. "find all replicas of an under-replicated object"). A relational model avoids duplicating join logic in app code.
- **Transactions.** SQLite gives real ACID transactions, which matter here: e.g. "create a new version + mark old version superseded" must be atomic.
- **Good enough concurrency for a demo.** SQLite handles concurrent reads fine and serializes writes; at hackathon scale (a handful of nodes, a demo workload) this is not a bottleneck.
- **Easy upgrade path.** The schema in this doc maps 1:1 to Postgres later — every table, type, and relationship translates directly. If the team wants multi-process write concurrency post-hackathon, swapping SQLite → Postgres is a connection-string change, not a redesign.

If the team prefers a hosted/managed option with zero local file management, **Postgres (e.g. via a free-tier hosted instance)** is the fallback — same schema, better concurrent-write handling, marginally more setup.

Avoid for this prototype: NoSQL/document stores (Mongo, DynamoDB). The data is highly relational and the integrity guarantees (foreign keys, transactions across a few rows) are exactly what a document store makes you re-implement by hand — not worth it under time pressure.

---

## 11. Tables / collections — full schema

### `objects`
| Field | Type | Notes |
|---|---|---|
| object_id | UUID (PK) | |
| key | TEXT | unique with `bucket` |
| bucket | TEXT | |
| current_version_id | UUID (FK) | nullable until first version commits |
| size_bytes | INTEGER | denormalized from current version |
| content_type | TEXT | nullable |
| replication_factor | INTEGER | default e.g. 3 |
| status | TEXT (enum) | active / deleting / deleted |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| deleted_at | DATETIME | nullable |

### `object_versions`
| Field | Type | Notes |
|---|---|---|
| version_id | UUID (PK) | |
| object_id | UUID (FK) | |
| version_number | INTEGER | monotonic per object |
| size_bytes | INTEGER | |
| canonical_checksum_id | UUID (FK) | |
| status | TEXT (enum) | writing / committed / superseded / deleted |
| created_at | DATETIME | |
| created_by | TEXT | nullable |

### `storage_nodes`
| Field | Type | Notes |
|---|---|---|
| node_id | UUID (PK) | |
| hostname | TEXT | |
| ip_address | TEXT | |
| port | INTEGER | |
| status | TEXT (enum) | healthy / suspected / unreachable / decommissioned |
| capacity_bytes | INTEGER | |
| used_bytes | INTEGER | |
| last_heartbeat_at | DATETIME | |
| joined_at | DATETIME | |
| zone | TEXT | nullable |
| version | TEXT | |

### `replicas`
| Field | Type | Notes |
|---|---|---|
| replica_id | UUID (PK) | |
| object_id | UUID (FK) | |
| version_id | UUID (FK) | |
| node_id | UUID (FK) | |
| status | TEXT (enum) | pending / active / stale / corrupt / missing / deleted |
| checksum_id | UUID (FK) | nullable |
| size_bytes | INTEGER | |
| created_at | DATETIME | |
| last_verified_at | DATETIME | nullable |
| verification_failures | INTEGER | default 0 |

### `checksums`
| Field | Type | Notes |
|---|---|---|
| checksum_id | UUID (PK) | |
| object_id | UUID (FK) | |
| version_id | UUID (FK) | |
| algorithm | TEXT | e.g. sha256 |
| value | TEXT | hex digest |
| scope | TEXT (enum) | canonical / replica_observed |
| node_id | UUID (FK) | nullable, set for replica_observed |
| computed_at | DATETIME | |

### `repair_tasks`
| Field | Type | Notes |
|---|---|---|
| task_id | UUID (PK) | |
| object_id | UUID (FK) | |
| version_id | UUID (FK) | |
| task_type | TEXT (enum) | re_replicate / verify / rebalance / delete_orphan |
| source_node_id | UUID (FK) | nullable |
| target_node_id | UUID (FK) | nullable |
| status | TEXT (enum) | queued / in_progress / completed / failed |
| reason | TEXT | |
| attempts | INTEGER | default 0 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### `node_heartbeat_log` (optional)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| node_id | UUID (FK) | |
| status_at_time | TEXT (enum) | |
| recorded_at | DATETIME | |

---

## 12. Example records

**objects**
```json
{
  "object_id": "obj-001",
  "key": "reports/q3-summary.pdf",
  "bucket": "default",
  "current_version_id": "ver-001",
  "size_bytes": 204800,
  "content_type": "application/pdf",
  "replication_factor": 3,
  "status": "active",
  "created_at": "2026-09-26T10:00:00Z",
  "updated_at": "2026-09-26T10:00:05Z",
  "deleted_at": null
}
```

**object_versions**
```json
{
  "version_id": "ver-001",
  "object_id": "obj-001",
  "version_number": 1,
  "size_bytes": 204800,
  "canonical_checksum_id": "chk-001",
  "status": "committed",
  "created_at": "2026-09-26T10:00:00Z",
  "created_by": "client-abc"
}
```

**storage_nodes**
```json
{
  "node_id": "node-A",
  "hostname": "vault-node-a",
  "ip_address": "10.0.0.11",
  "port": 9001,
  "status": "healthy",
  "capacity_bytes": 500000000000,
  "used_bytes": 12000000000,
  "last_heartbeat_at": "2026-09-26T10:05:00Z",
  "joined_at": "2026-09-20T00:00:00Z",
  "zone": "rack-1",
  "version": "0.1.0"
}
```

**replicas**
```json
{
  "replica_id": "rep-001",
  "object_id": "obj-001",
  "version_id": "ver-001",
  "node_id": "node-A",
  "status": "active",
  "checksum_id": "chk-002",
  "size_bytes": 204800,
  "created_at": "2026-09-26T10:00:03Z",
  "last_verified_at": "2026-09-26T10:00:03Z",
  "verification_failures": 0
}
```

**checksums**
```json
{
  "checksum_id": "chk-001",
  "object_id": "obj-001",
  "version_id": "ver-001",
  "algorithm": "sha256",
  "value": "3f786850e387550fdab836ed7e6dc881de23001",
  "scope": "canonical",
  "node_id": null,
  "computed_at": "2026-09-26T10:00:00Z"
}
```

**repair_tasks**
```json
{
  "task_id": "task-001",
  "object_id": "obj-001",
  "version_id": "ver-001",
  "task_type": "re_replicate",
  "source_node_id": "node-A",
  "target_node_id": "node-C",
  "status": "queued",
  "reason": "node_unreachable",
  "attempts": 0,
  "created_at": "2026-09-26T10:10:00Z",
  "updated_at": "2026-09-26T10:10:00Z"
}
```

---

## 13. How metadata changes during key operations

### Upload
1. Client requests upload for key `X`. If `objects` row for `X` doesn't exist, create it (`status = active`).
2. Insert a new `object_versions` row: `version_number = prev + 1`, `status = writing`.
3. Compute canonical checksum of the incoming bytes → insert `checksums` row (`scope = canonical`), link via `canonical_checksum_id`.
4. Select N healthy nodes (N = `replication_factor`) via placement logic (outside DB scope).
5. For each target node: insert a `replicas` row with `status = pending`.
6. As each node confirms the write, update that replica's `status = active`, set `size_bytes`, `checksum_id` (replica_observed, should match canonical).
7. Once a quorum (e.g. majority or all N, per policy) of replicas are `active`: set `object_versions.status = committed`, update `objects.current_version_id`, `size_bytes`, `updated_at`.
8. If a previous version existed, set its `status = superseded`.

### Download
1. Look up `objects` by key → get `current_version_id`.
2. Look up `replicas` where `version_id = current_version_id AND status = active`, ordered by node health/proximity.
3. Pick one (or a few, for parallel-read fault tolerance) and serve bytes from that node.
4. Optionally: verify returned bytes' hash against `checksums.canonical` before returning to client; on mismatch, mark that replica `corrupt`, insert a `repair_tasks` row (`reason = checksum_mismatch`), and retry another replica.
5. No metadata is *changed* on a normal successful download except optionally `last_verified_at` on the replica used, if verification ran.

### Node failure
1. Heartbeat monitor detects `storage_nodes.last_heartbeat_at` is stale beyond threshold → update `status: healthy → suspected`, then `→ unreachable` if it persists. Log both transitions in `node_heartbeat_log`.
2. On transition to `unreachable`: find all `replicas` where `node_id = <failed node> AND status = active`, set their `status = missing`.
3. For each affected object-version, count remaining `active` replicas. If count < `replication_factor`, insert a `repair_tasks` row (`task_type = re_replicate`, `reason = node_unreachable`, `source_node_id` = a healthy replica holder, `target_node_id` = null until a replacement node is chosen).

### Replica repair
1. A repair worker picks up a `queued` repair_task, sets `status = in_progress`, increments `attempts`.
2. Worker copies bytes from `source_node_id` to a chosen healthy `target_node_id`.
3. On success: insert a new `replicas` row for `target_node_id` (`status = active`), verify checksum matches canonical, insert a `replica_observed` checksum row.
4. Mark the repair task `status = completed`, `updated_at = now`.
5. On failure (target unreachable, checksum fails, etc.): mark `status = failed` (or re-queue with backoff if `attempts` below a max), and record `reason`.

### Node recovery
1. Node resumes sending heartbeats → `storage_nodes.status: unreachable → healthy`, log transition.
2. Trigger a reconciliation `verify` task per object-version this node was believed to hold: compare the node's actual data against expected replicas.
3. For each replica previously marked `missing` on this node: if data still exists and checksum matches canonical → `status = active`, update `last_verified_at`. If data is gone or corrupt → leave as `missing`/mark `corrupt`, and the existing/queued `re_replicate` task proceeds as normal (now possibly using this recovered node as a valid target instead).
4. If, after recovery, an object-version now has *more* than `replication_factor` active replicas (e.g. repair already created a replacement elsewhere), queue a `rebalance` task to remove the least-useful extra copy and free space.

### Object deletion
1. Set `objects.status = deleting`, `deleted_at = now` (soft delete — keeps history and avoids racing in-flight reads).
2. Set current `object_versions.status = deleted`.
3. Set all associated `replicas.status = deleted` (logically; bytes not yet removed from disk).
4. Insert `repair_tasks` (`task_type = delete_orphan`) per node holding a replica, instructing that node's cleanup worker to physically remove the bytes.
5. Once all nodes confirm physical deletion (tasks `completed`), the object row can either remain as a tombstone (`status = deleted`) for audit purposes, or be purged after a retention window — team's choice for the hackathon (tombstone is simpler and safer to demo).

---

## Design principles recap (why it's built this way)

- **Versions, not mutation** → safe concurrency, no in-place data races, rollback is trivial.
- **Replicas as their own table** → repair/rebalance logic is just "count active replicas vs. replication_factor," independent of object logic.
- **Checksums separated by scope** → lets the system distinguish "what it should be" from "what it currently is" per replica, which is exactly what integrity verification needs.
- **Repair as a queue, not a side effect** → failures (node down, corruption, imbalance) all funnel into the same `repair_tasks` table, so one worker loop handles all self-healing.
- **Soft status everywhere** → nothing is hard-deleted immediately; state transitions are explicit and auditable, which matters both for correctness and for demoing "the system healed itself" live.
