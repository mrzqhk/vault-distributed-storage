# Vault — API Specification

**Base URL (Coordinator, public-facing):** `http://localhost:8000/api/v1`
**Format:** JSON over REST, except object bytes which use `multipart/form-data` or raw binary body for upload/download.
**Consistency with ARCHITECTURE.md:** All endpoints here map directly to flows described in `ARCHITECTURE.md` (§5 upload, §6 read, §11 repair, §12 rebalancing, §8 health).

Internal node-to-node / Coordinator-to-node endpoints are listed separately in §10, since they are not part of the public client-facing API but are required for the system to function and for consistency between docs.

---

## Conventions

- All responses are JSON unless returning raw object bytes.
- All error responses use this shape:
  ```json
  { "error": { "code": "STRING_CODE", "message": "human readable description" } }
  ```
- Timestamps are ISO-8601 UTC (`2026-09-26T14:03:00Z`).
- `object_id` is a server-generated UUID; `key` is the user-facing name (may repeat across versions).

---

## 1. Upload Object

**`POST /api/v1/objects`**

**Purpose:** Upload a new object, or a new version of an existing key. Triggers the write flow in ARCHITECTURE.md §5.

**Request:**
- `multipart/form-data`:
  - `file`: binary object content (required)
  - `key`: string, user-facing object name (required)
  - `replication_factor`: int, optional (defaults to global config, e.g. 3)
  - `checksum_sha256`: string, optional client-supplied checksum for end-to-end verification (server always recomputes its own authoritative checksum regardless)

**Response — `201 Created`:**
```json
{
  "object_id": "3f1a9e2c-...-b8",
  "key": "photos/vacation.png",
  "version": 1,
  "size_bytes": 204800,
  "checksum_sha256": "9f86d081...",
  "replication_factor": 3,
  "replica_nodes": ["node-a", "node-b", "node-c"],
  "status": "ACTIVE",
  "created_at": "2026-09-26T14:03:00Z"
}
```

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 400 | `MISSING_FILE` | No file content provided |
| 400 | `INVALID_REPLICATION_FACTOR` | `replication_factor` > number of healthy nodes, or < 1 |
| 409 | `CHECKSUM_MISMATCH` | Client-supplied checksum didn't match server-computed checksum |
| 503 | `WRITE_QUORUM_NOT_MET` | Fewer than `W` nodes acknowledged the write; upload rolled back, client should retry |
| 507 | `INSUFFICIENT_CAPACITY` | Not enough healthy nodes with free capacity to place replicas |

---

## 2. Retrieve Object

**`GET /api/v1/objects/{object_id}`**

**Purpose:** Fetch an object's bytes. Implements the read flow in ARCHITECTURE.md §6, including automatic failover between replicas and checksum verification.

**Query params:**
- `consistency` (optional): `fast` (default, R=1) or `strong` (R=majority, returns highest-versioned confirmed-matching copy)

**Request:** none (GET)

**Response — `200 OK`:**
- Body: raw object bytes
- Headers:
  - `X-Vault-Checksum-SHA256: 9f86d081...`
  - `X-Vault-Version: 1`
  - `X-Vault-Served-By: node-b`

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 404 | `OBJECT_NOT_FOUND` | No object with this `object_id` (or it was deleted) |
| 503 | `ALL_REPLICAS_UNAVAILABLE` | Every known replica is unreachable or failed checksum verification |
| 504 | `STRONG_CONSISTENCY_TIMEOUT` | Couldn't reach a read quorum in time for `consistency=strong` |

---

## 3. Retrieve Object by Key (latest version)

**`GET /api/v1/objects/by-key/{key}`**

**Purpose:** Convenience lookup for clients that think in terms of names rather than `object_id`s; resolves to the latest non-deleted version.

**Response / errors:** identical shape to §2.

---

## 4. Delete Object

**`DELETE /api/v1/objects/{object_id}`**

**Purpose:** Mark an object deleted. Per ARCHITECTURE.md §13, this is a synchronous metadata tombstone with asynchronous byte cleanup on nodes.

**Request:** none

**Response — `202 Accepted`:**
```json
{
  "object_id": "3f1a9e2c-...-b8",
  "status": "DELETED",
  "deleted_at": "2026-09-26T14:10:00Z"
}
```
(`202` rather than `204` because physical deletion from nodes happens asynchronously — the object is immediately invisible to reads, but background cleanup is still pending.)

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 404 | `OBJECT_NOT_FOUND` | Object doesn't exist or is already deleted |

---

## 5. Get Object Metadata

**`GET /api/v1/objects/{object_id}/metadata`**

**Purpose:** Inspect an object's replication/health state without downloading its bytes — primarily used by the Dashboard's object detail view (ARCHITECTURE.md §15).

**Response — `200 OK`:**
```json
{
  "object_id": "3f1a9e2c-...-b8",
  "key": "photos/vacation.png",
  "version": 1,
  "size_bytes": 204800,
  "checksum_sha256": "9f86d081...",
  "replication_factor": 3,
  "status": "UNDER_REPLICATED",
  "replicas": [
    { "node_id": "node-a", "status": "SYNCED", "last_verified_at": "2026-09-26T14:09:00Z" },
    { "node_id": "node-b", "status": "MISSING", "last_verified_at": null },
    { "node_id": "node-c", "status": "SYNCED", "last_verified_at": "2026-09-26T14:09:00Z" }
  ],
  "created_at": "2026-09-26T14:03:00Z",
  "updated_at": "2026-09-26T14:09:00Z"
}
```

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 404 | `OBJECT_NOT_FOUND` | No such object |

---

## 6. List Objects

**`GET /api/v1/objects`**

**Purpose:** Power the Dashboard's object browser; supports basic filtering.

**Query params (all optional):**
- `status`: filter by `ACTIVE` / `UNDER_REPLICATED` / `DEGRADED` / `DELETED`
- `prefix`: filter by key prefix
- `limit`, `offset`: pagination (defaults `limit=50, offset=0`)

**Response — `200 OK`:**
```json
{
  "total": 128,
  "limit": 50,
  "offset": 0,
  "objects": [
    { "object_id": "...", "key": "...", "size_bytes": 204800, "status": "ACTIVE", "replication_factor": 3, "replica_count": 3 }
  ]
}
```

---

## 7. Update Replication Configuration

**`PATCH /api/v1/objects/{object_id}/replication`**

**Purpose:** Change an existing object's desired replication factor (ARCHITECTURE.md §7). The repair/rebalance loop converges actual replica count to the new target.

**Request:**
```json
{ "replication_factor": 5 }
```

**Response — `202 Accepted`:**
```json
{
  "object_id": "3f1a9e2c-...-b8",
  "replication_factor": 5,
  "current_replica_count": 3,
  "status": "UNDER_REPLICATED",
  "message": "Replication factor updated; repair loop will converge replica count."
}
```

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_REPLICATION_FACTOR` | Value < 1 or exceeds total healthy node count |
| 404 | `OBJECT_NOT_FOUND` | No such object |

---

## 8. Set Global Default Replication Policy

**`PUT /api/v1/config/replication`**

**Purpose:** Set the cluster-wide default replication factor and quorum sizes, applied to future uploads that don't specify their own.

**Request:**
```json
{
  "default_replication_factor": 3,
  "write_quorum": 2,
  "read_consistency_default": "fast"
}
```

**Response — `200 OK`:** echoes the applied config.

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_CONFIG` | `write_quorum` > `default_replication_factor`, or values out of valid range |

---

## 9. List Storage Nodes

**`GET /api/v1/nodes`**

**Purpose:** Cluster overview for the Dashboard (ARCHITECTURE.md §15 §8).

**Response — `200 OK`:**
```json
{
  "nodes": [
    {
      "node_id": "node-a",
      "address": "node-a:8080",
      "status": "HEALTHY",
      "last_heartbeat_at": "2026-09-26T14:11:58Z",
      "capacity_bytes": 10737418240,
      "used_bytes": 2147483648,
      "object_count": 42
    },
    {
      "node_id": "node-b",
      "address": "node-b:8080",
      "status": "DEAD",
      "last_heartbeat_at": "2026-09-26T14:09:10Z",
      "capacity_bytes": 10737418240,
      "used_bytes": 1073741824,
      "object_count": 30
    }
  ]
}
```

---

## 10. Get Node Health / Status

**`GET /api/v1/nodes/{node_id}`**

**Purpose:** Drill into a single node's detail view.

**Response — `200 OK`:**
```json
{
  "node_id": "node-a",
  "address": "node-a:8080",
  "status": "HEALTHY",
  "last_heartbeat_at": "2026-09-26T14:11:58Z",
  "capacity_bytes": 10737418240,
  "used_bytes": 2147483648,
  "object_count": 42,
  "recent_events": [
    { "type": "HEARTBEAT_MISSED", "at": "2026-09-26T14:05:00Z" },
    { "type": "RECOVERED", "at": "2026-09-26T14:05:10Z" }
  ]
}
```

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 404 | `NODE_NOT_FOUND` | No such node registered |

---

## 11. Trigger / Check Repair

**`POST /api/v1/repair/trigger`**

**Purpose:** Manually kick off an out-of-cycle repair sweep (useful for demoing repair on demand rather than waiting for the periodic loop — ARCHITECTURE.md §11).

**Request (optional body — omit to sweep the whole cluster):**
```json
{ "object_id": "3f1a9e2c-...-b8" }
```

**Response — `202 Accepted`:**
```json
{
  "repair_job_id": "job-77a1",
  "scope": "single_object",
  "status": "QUEUED"
}
```

**`GET /api/v1/repair/jobs/{repair_job_id}`**

**Purpose:** Poll the status of a repair job (also drives the Dashboard's live event log).

**Response — `200 OK`:**
```json
{
  "repair_job_id": "job-77a1",
  "status": "IN_PROGRESS",
  "object_id": "3f1a9e2c-...-b8",
  "source_node": "node-a",
  "target_node": "node-d",
  "started_at": "2026-09-26T14:12:00Z",
  "completed_at": null
}
```

**`GET /api/v1/repair/queue`**

**Purpose:** List all currently queued/in-progress repair jobs — used by the Dashboard to show "system is healing" state.

**Response — `200 OK`:**
```json
{
  "queued": 2,
  "in_progress": 1,
  "jobs": [
    { "repair_job_id": "job-77a1", "object_id": "...", "status": "IN_PROGRESS" },
    { "repair_job_id": "job-77a2", "object_id": "...", "status": "QUEUED" }
  ]
}
```

**Error cases:**
| Status | Code | Meaning |
|---|---|---|
| 404 | `OBJECT_NOT_FOUND` | (trigger) specified `object_id` doesn't exist |
| 404 | `REPAIR_JOB_NOT_FOUND` | (status check) unknown `repair_job_id` |
| 409 | `ALREADY_FULLY_REPLICATED` | (trigger) object already has full healthy replica count; nothing to do |

---

## 12. Trigger Rebalance

**`POST /api/v1/rebalance/trigger`**

**Purpose:** Manually kick off a rebalancing pass (ARCHITECTURE.md §12) — e.g. right after adding a new node, for demo purposes.

**Request:** none

**Response — `202 Accepted`:**
```json
{ "rebalance_job_id": "rb-14", "status": "QUEUED" }
```

**`GET /api/v1/rebalance/jobs/{rebalance_job_id}`**

**Response — `200 OK`:**
```json
{
  "rebalance_job_id": "rb-14",
  "status": "COMPLETED",
  "objects_migrated": 6,
  "started_at": "2026-09-26T14:15:00Z",
  "completed_at": "2026-09-26T14:15:42Z"
}
```

---

## 13. System Events / Live Log

**`GET /api/v1/events`**

**Purpose:** Backs the Dashboard's live event stream (heartbeats lost, corruption detected, repairs, rebalances). Polling-friendly; a WebSocket variant (`GET /api/v1/events/stream`) is a stretch goal for true real-time push.

**Query params:** `since` (ISO timestamp or event cursor), `limit` (default 100)

**Response — `200 OK`:**
```json
{
  "events": [
    { "type": "NODE_MARKED_DEAD", "node_id": "node-b", "at": "2026-09-26T14:09:20Z" },
    { "type": "CORRUPTION_DETECTED", "object_id": "3f1a9e2c-...-b8", "node_id": "node-a", "at": "2026-09-26T14:10:00Z" },
    { "type": "REPAIR_COMPLETED", "object_id": "3f1a9e2c-...-b8", "at": "2026-09-26T14:12:30Z" }
  ]
}
```

---

## 14. Chaos / Failure Injection (Demo-only, Admin API)

These endpoints exist purely to make ARCHITECTURE.md §14 demoable through the Dashboard, and would not exist in a production system. They should be feature-flagged / disabled outside of demo mode.

**`POST /api/v1/admin/chaos/kill-node`**
```json
{ "node_id": "node-b" }
```
→ `202 Accepted` — stops the target node's process/container.

**`POST /api/v1/admin/chaos/restart-node`**
```json
{ "node_id": "node-b" }
```
→ `202 Accepted` — restarts it; node re-registers and reconciles per ARCHITECTURE.md §8.

**`POST /api/v1/admin/chaos/partition-node`**
```json
{ "node_id": "node-c", "duration_seconds": 20 }
```
→ `202 Accepted` — blocks Coordinator↔node traffic for the given duration.

**`POST /api/v1/admin/chaos/corrupt-object`**
```json
{ "object_id": "3f1a9e2c-...-b8", "node_id": "node-a" }
```
→ `202 Accepted` — flips bytes in that replica's on-disk copy so the next scrub/read detects corruption.

**Error cases (all chaos endpoints):**
| Status | Code | Meaning |
|---|---|---|
| 404 | `NODE_NOT_FOUND` / `OBJECT_NOT_FOUND` | Target doesn't exist |
| 403 | `CHAOS_MODE_DISABLED` | Admin/chaos API disabled (e.g. in a non-demo environment) |

---

## 15. Internal Node API (Coordinator ⟷ Node, and Node ⟷ Node)

Not part of the public client-facing API, but documented here for consistency with ARCHITECTURE.md, since correct implementation of the public API depends on these existing.

| Method & Path | Purpose |
|---|---|
| `PUT /internal/replicas/{object_id}` | Coordinator → Node: store a new replica (body = object bytes + expected checksum + version) |
| `GET /internal/replicas/{object_id}` | Coordinator/Node → Node: fetch replica bytes (used for client reads and for repair/rebalance pulls) |
| `DELETE /internal/replicas/{object_id}` | Coordinator → Node: remove a replica (used after rebalance migration, or tombstone cleanup) |
| `POST /internal/heartbeat` | Node → Coordinator: periodic liveness + capacity report (ARCHITECTURE.md §8) |
| `POST /internal/report-corruption` | Node → Coordinator: report a failed self-scrub checksum (ARCHITECTURE.md §10) |
| `POST /internal/replicate` | Coordinator → Node: "pull object X from node Y" instruction used during repair/rebalance (ARCHITECTURE.md §11–12) |
| `POST /internal/inject-corruption/{object_id}` | Chaos tooling → Node: test hook to corrupt on-disk bytes directly (ARCHITECTURE.md §14) |

These use the same JSON error envelope as the public API where applicable.

---

## 16. Endpoint Summary Table

| Method | Path | Purpose |
|---|---|---|
| POST | `/objects` | Upload object |
| GET | `/objects/{object_id}` | Retrieve object bytes |
| GET | `/objects/by-key/{key}` | Retrieve latest version by key |
| DELETE | `/objects/{object_id}` | Delete object (tombstone) |
| GET | `/objects/{object_id}/metadata` | Get object metadata / replica health |
| GET | `/objects` | List objects (filterable) |
| PATCH | `/objects/{object_id}/replication` | Change an object's replication factor |
| PUT | `/config/replication` | Set cluster-wide default replication policy |
| GET | `/nodes` | List storage nodes |
| GET | `/nodes/{node_id}` | Get single node health/status |
| POST | `/repair/trigger` | Trigger repair (single object or full sweep) |
| GET | `/repair/jobs/{repair_job_id}` | Check a repair job's status |
| GET | `/repair/queue` | List queued/in-progress repair jobs |
| POST | `/rebalance/trigger` | Trigger a rebalance pass |
| GET | `/rebalance/jobs/{rebalance_job_id}` | Check rebalance job status |
| GET | `/events` | Live system event log |
| POST | `/admin/chaos/kill-node` | Demo: kill a node |
| POST | `/admin/chaos/restart-node` | Demo: restart a node |
| POST | `/admin/chaos/partition-node` | Demo: simulate a network partition |
| POST | `/admin/chaos/corrupt-object` | Demo: inject corruption into a replica |

---

## Technology Choices Recap (see ARCHITECTURE.md §17 for full reasoning)

- **API framework:** FastAPI (Python) or Express/Fastify (Node.js) — quick to scaffold REST + async I/O for fan-out writes/reads.
- **Data format:** JSON for metadata/control, raw binary for object payloads.
- **Checksums:** SHA-256 everywhere integrity matters (write, read, scrub) — one mechanism, three uses.
- **Transport:** Plain REST/HTTP — easy to test with `curl`/Postman during development and live demo.
