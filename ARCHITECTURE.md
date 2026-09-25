# Vault — System Architecture

**Project:** Vault — Fault-Tolerant Distributed Object Storage
**Scope:** Hackathon prototype (4-person team), NOT production scale
**Goal:** Demonstrate the core mechanics of a distributed storage system — replication, failure detection, corruption detection, repair, rebalancing — in a way that is simple to implement, run locally, and demo live.

---

## 1. Design Philosophy

We are optimizing for:
- **Demonstrability** — every hard distributed-systems concept (replication, failure, repair) must be visibly triggerable and observable in a live demo.
- **Simplicity of implementation** — a small team must be able to build this in a hackathon timeframe.
- **Correctness over performance** — we accept slower operations if it keeps the logic simple and predictable.

We are explicitly **not** building:
- A CP/AP-tunable system with Paxos/Raft-level consensus for data itself
- A system that scales to real "large volumes of data" in the production sense
- Byzantine fault tolerance
- Multi-datacenter awareness

We simulate "large volumes of data across unreliable nodes" using multiple local processes/containers with artificially injected failure/latency/corruption, not a real multi-region cluster.

---

## 2. High-Level Architecture

Vault uses a **single active Coordinator + multiple Storage Nodes** design (a simplified GFS/HDFS-style architecture), with a lightweight metadata store owned by the Coordinator.

```
                            ┌───────────────────────┐
                            │        Client          │
                            │ (CLI / Dashboard / SDK)│
                            └───────────┬────────────┘
                                        │ REST/HTTP
                                        ▼
                            ┌───────────────────────┐
                            │      COORDINATOR       │
                            │ ─────────────────────  │
                            │ • Metadata Store (DB)  │
                            │ • Placement Engine     │
                            │ • Health Monitor        │
                            │ • Repair Manager        │
                            │ • Rebalancer            │
                            │ • API Gateway           │
                            └───────┬───────┬─────────┘
                                    │       │
                 ┌──────────────────┘       └──────────────────┐
                 ▼                                              ▼
        ┌─────────────────┐                            ┌─────────────────┐
        │  Storage Node A  │  ◄──heartbeat/replication──►  Storage Node B  │
        │  ─────────────── │                            │  ─────────────── │
        │ • Object Store   │        ...more nodes...     │ • Object Store   │
        │ • Checksum Index │                            │ • Checksum Index │
        │ • Local API      │                            │ • Local API      │
        └─────────────────┘                            └─────────────────┘
```

**Why Coordinator-based (vs. fully peer-to-peer / DHT):**
A single coordinator (logically single — see §12 for single-point-of-failure handling) makes metadata consistency, placement decisions, and failure detection dramatically simpler to implement and reason about than a gossip-based or consistent-hashing peer-to-peer design (like Dynamo/Cassandra). For a hackathon, correctness and demo-ability of the coordinator model beats the operational complexity of leaderless replication.

---

## 3. Components

### 3.1 Coordinator

The Coordinator is the brain of the system. It never stores object bytes itself — only metadata.

Responsibilities:
1. **API Gateway** — receives all client requests (upload/retrieve/delete/list/status).
2. **Placement Engine** — decides which N storage nodes should hold each object's replicas.
3. **Metadata Store** — tracks object → replica-location mapping, checksums, versions, replication factor.
4. **Health Monitor** — tracks node liveness via heartbeats; marks nodes `HEALTHY`, `SUSPECTED`, or `DEAD`.
5. **Repair Manager** — detects under-replicated or corrupted objects and schedules repair jobs.
6. **Rebalancer** — periodically redistributes objects when nodes join, leave, or become imbalanced.

The Coordinator is a **stateless-computation / stateful-metadata** service: all durable state lives in its metadata DB, so the Coordinator process itself can be restarted without data loss (though for this prototype we run a single Coordinator instance — see Limitations).

### 3.2 Storage Node

Each Storage Node is a simple service that:
1. Stores object **replicas** as files on local disk (or in-memory for demo speed), keyed by `object_id` + `version`.
2. Computes and stores a **SHA-256 checksum** for every object it holds.
3. Exposes a small local HTTP API for the Coordinator and other nodes to PUT/GET/DELETE/VERIFY objects.
4. Sends periodic **heartbeats** to the Coordinator (push model) containing: node ID, disk usage, object count, status.
5. Can **pull** a replica from another node (used during repair/rebalancing).
6. Runs a background **self-scrub** task that periodically re-hashes stored objects and reports corruption to the Coordinator.

Storage Nodes are intentionally "dumb" — they do not talk to each other to make decisions; they only move bytes when told to by the Coordinator (or, for simplicity, may directly pull from a peer node once instructed which peer to pull from). This keeps node logic minimal.

### 3.3 Client / Dashboard

- **CLI / SDK**: a thin HTTP client wrapping the API in `API.md`.
- **Dashboard**: a web UI (see §14) that visualizes node health, replica maps, and lets the demo operator inject failures live.

---

## 4. Metadata Management

Metadata is the source of truth for "what exists and where." It is stored in a relational or embedded DB on the Coordinator (SQLite for the prototype — see tech stack).

### Metadata Schema (conceptual)

**`objects`**
| field | type | notes |
|---|---|---|
| object_id | string (UUID) | primary key |
| key / name | string | user-facing name, unique per namespace |
| size_bytes | int | |
| checksum_sha256 | string | checksum of the canonical object content |
| version | int | incremented on overwrite |
| replication_factor | int | desired number of replicas (default: global config) |
| status | enum | `ACTIVE`, `UNDER_REPLICATED`, `DEGRADED`, `DELETED` |
| created_at / updated_at | timestamp | |

**`replica_locations`**
| field | type | notes |
|---|---|---|
| object_id | FK → objects | |
| node_id | FK → nodes | |
| version | int | must match objects.version to be "current" |
| replica_checksum | string | last known checksum reported by that node |
| replica_status | enum | `SYNCED`, `SUSPECTED_CORRUPT`, `MISSING`, `STALE` |
| last_verified_at | timestamp | |

**`nodes`**
| field | type | notes |
|---|---|---|
| node_id | string | primary key |
| address | string | host:port |
| status | enum | `HEALTHY`, `SUSPECTED`, `DEAD` |
| last_heartbeat_at | timestamp | |
| capacity_bytes / used_bytes | int | for placement + rebalancing decisions |

**Why one metadata store, not distributed metadata:** Distributed metadata (e.g., via Raft) is the "correct" production answer but is a disproportionate amount of engineering effort for a hackathon. A single embedded DB on the Coordinator keeps metadata **strongly consistent by construction** (single writer), which is exactly the property we need to reason about replica state simply. The tradeoff (Coordinator = single point of failure) is accepted and documented in Limitations (§16).

---

## 5. File Upload / Write Flow

```
Client            Coordinator                 Node A     Node B     Node C
  │  POST /objects     │                          │          │          │
  ├────────────────────►                          │          │          │
  │                     │ 1. Generate object_id    │          │          │
  │                     │ 2. Compute placement     │          │          │
  │                     │    (pick N healthy nodes)│          │          │
  │                     ├──────────PUT replica─────►          │          │
  │                     ├──────────PUT replica────────────────►          │
  │                     ├──────────PUT replica───────────────────────────►
  │                     │ 3. Wait for W acks        │          │          │
  │                     │    (write quorum)         │          │          │
  │                     │◄───ack + checksum─────────┤          │          │
  │                     │◄───ack + checksum────────────────────┤          │
  │                     │ 4. Commit metadata row    │          │          │
  │                     │    (status=ACTIVE if      │          │          │
  │                     │     W acks received)      │          │          │
  │  ◄──201 Created─────┤                          │          │          │
```

Steps:
1. Client uploads object bytes (`PUT/POST /objects`) with an optional client-computed checksum.
2. Coordinator generates an `object_id`, computes **SHA-256** of the payload (server-side, authoritative).
3. Coordinator's **Placement Engine** selects `N` (replication factor) currently `HEALTHY` nodes, using a simple strategy (see §7).
4. Coordinator streams/copies the object to all N nodes in parallel.
5. Coordinator waits for a **write quorum `W`** (configurable, default `W = ceil((N+1)/2)`, i.e. majority) of nodes to acknowledge with a matching checksum.
6. Once quorum is met, Coordinator commits the metadata row (`status = ACTIVE`, replica list = acking nodes). Nodes that hadn't yet acked when quorum was reached continue writing in the background; if they fail, the object is `UNDER_REPLICATED` and gets queued for repair.
7. If quorum is **not** reached (e.g., too many nodes failed mid-write), the upload fails and the client is told to retry; the Coordinator cleans up any partial replicas.

**Why quorum writes instead of "all N must succeed":** Requiring all N replicas to succeed makes writes fail whenever *any* single node is slow/down — defeating the purpose of "fault tolerance." A majority write quorum is the standard technique (used by Dynamo, Cassandra) to keep writes available despite a minority of node failures, while still guaranteeing overlap with read quorums (§6).

---

## 6. File Retrieval / Read Flow

```
Client            Coordinator                 Node A     Node B     Node C
  │ GET /objects/{id}   │                          │          │          │
  ├─────────────────────►                          │          │          │
  │                     │ 1. Lookup replica list    │          │          │
  │                     │    from metadata          │          │          │
  │                     │ 2. Pick R nodes to read    │          │          │
  │                     │    (prefer HEALTHY, low    │          │          │
  │                     │    latency)                │          │          │
  │                     ├──────────GET replica───────►          │          │
  │                     │◄───bytes + checksum────────┤          │          │
  │                     │ 3. Verify checksum vs      │          │          │
  │                     │    metadata record         │          │          │
  │  ◄───200 + bytes────┤                          │          │          │
```

Steps:
1. Coordinator looks up `object_id → replica_locations` from metadata.
2. Coordinator picks one `HEALTHY` node (default: lowest recent latency / round-robin) to serve the read — this is the **read quorum `R = 1`** fast path.
3. Coordinator (or the client, optionally) verifies the returned bytes' checksum against the metadata's authoritative checksum.
4. **If the checksum mismatches** (corruption detected) or the node is unreachable, the Coordinator retries with the next replica in the list, and simultaneously flags that replica as `SUSPECTED_CORRUPT` / `MISSING` in metadata, triggering repair (§10).
5. Only if **all** known replicas fail/mismatch does the read return `404/503` (data unavailable).

**Why R=1 by default, not majority read:** Since writes use a majority quorum, and we don't require read-your-writes strong consistency for this prototype, a single healthy replica is sufficient for normal reads — this keeps reads fast (important for demoing "the system stays available"). We treat this as **eventual consistency** with checksum-verified reads: correctness of *content* is still guaranteed (via SHA-256 verification), even though the specific replica served may occasionally be a slightly stale version under concurrent writes (see §11). Strong/majority reads can be offered as an optional `?consistency=strong` flag that reads from R=majority nodes and returns the highest-versioned matching result — implemented if time allows, documented as optional here.

---

## 7. Replication Strategy & Configurable Replication Factor

- Each object has a **replication factor `N`** (default from global config, e.g. `N=3`; overridable per-upload via an API field/header).
- **Placement strategy (prototype-simple):** Coordinator maintains an in-memory sorted list of `HEALTHY` nodes ranked by available capacity; for each new object it picks the top `N` nodes with the most free capacity, adding light randomization to avoid always picking the same "top" node (poor-man's load spreading — a simplified version of "weighted random placement" used in Ceph/HDFS).
- **Rack/zone awareness:** out of scope for the prototype, but the placement function is written as a pluggable strategy (`select_nodes(N, exclude=[])`) so a future zone-aware version could be swapped in without changing the rest of the system.
- Replication factor can be changed **after upload** via `PATCH /objects/{id}/replication` — this simply updates `objects.replication_factor` and lets the normal repair/rebalance loop converge the actual replica count up or down to match.

---

## 8. Node Health, Heartbeats & Failure Detection

- Each Storage Node sends a **heartbeat** (`POST /internal/heartbeat`) to the Coordinator every `HEARTBEAT_INTERVAL` (default: 3s), containing node ID, timestamp, disk usage, object count.
- The Coordinator's Health Monitor runs a periodic sweep (every 1s):
  - If `now - last_heartbeat > SUSPECT_TIMEOUT` (default 9s, i.e. 3 missed heartbeats) → mark node `SUSPECTED`.
  - If `now - last_heartbeat > DEAD_TIMEOUT` (default 20s) → mark node `DEAD`.
- **`SUSPECTED`** nodes are excluded from new placement decisions and deprioritized for reads, but their replicas are not yet considered lost (avoids false-positive repair storms from transient blips).
- **`DEAD`** nodes have all their hosted replicas immediately marked `MISSING` in `replica_locations`, which flips affected objects to `UNDER_REPLICATED`, queuing them for repair.
- If a `DEAD` node later comes back online and re-registers, the Coordinator reconciles: any object versions it still holds that match current metadata are re-validated (checksum-verified) and reinstated as `SYNCED`; stale/older versions are discarded and re-synced.

**Why simple timeout-based failure detection, not a consensus-based failure detector (e.g. SWIM, Phi Accrual):** Timeout thresholds are trivial to implement, easy to explain in a demo ("we killed the node, watch the dashboard mark it dead in ~10s and start repairing"), and sufficient for a controlled hackathon environment where we are not defending against adversarial or highly flaky networks.

---

## 9. Handling Node Failures & Network Partitions

**Node failure (crash / kill):**
- Detected via heartbeat timeout (§8).
- Reads automatically fail over to the next replica in the metadata list.
- Writes in flight to the dead node simply don't ack; if quorum is still reached via other nodes, the write succeeds and the object is flagged `UNDER_REPLICATED` for background repair.

**Network partition (Coordinator ⟷ subset of nodes unreachable, but nodes are otherwise alive):**
- From the Coordinator's point of view, a partitioned node is indistinguishable from a dead one — it simply stops heartbeating and is marked `SUSPECTED` → `DEAD` the same way. This is an intentional simplification: **we do not implement true split-brain detection.**
- Because we only run **one Coordinator**, there is no risk of two coordinators disagreeing about metadata during a partition (no split-brain on the metadata layer). The tradeoff is that the Coordinator itself is a single point of failure (§16).
- If a node is partitioned from the Coordinator but still reachable by *another* node (partial partition), the prototype does not attempt cross-node gossip to detect this nuance — it is treated the same as a full node failure. This is called out explicitly as a documented simplification, not an oversight.
- **Demo simulation of partitions:** we simulate a "partition" simply by having the injected-failure tool (§13) block/drop traffic between the Coordinator and a specific node (e.g., via a toxic proxy or firewall rule / Docker network disconnect), which is operationally identical to a node failure from the Coordinator's perspective — and that's fine for demo purposes.

---

## 10. Integrity Verification & Corruption Detection

- **On write:** every node computes SHA-256 of the bytes it stores and returns it in the write-ack; Coordinator compares against the authoritative checksum computed at ingest time. Mismatch on write ⇒ that node's replica is rejected/marked `SUSPECTED_CORRUPT`, and Coordinator tries another node to satisfy quorum.
- **On read:** the checksum of bytes returned is verified against the metadata's authoritative checksum before serving to the client (§6).
- **Background scrubbing:** each Storage Node runs a low-priority background loop that periodically (e.g., every `SCRUB_INTERVAL`, staggered per object to avoid I/O spikes) re-reads each locally stored object, recomputes SHA-256, and compares to the checksum it stored at write time.
  - If mismatch → node reports `CORRUPT` for that `(object_id, version)` to the Coordinator via `POST /internal/report-corruption`.
  - Coordinator marks that `replica_locations` row `SUSPECTED_CORRUPT`, excludes it from future reads, and schedules a repair (re-fetch a clean copy from another replica and overwrite the corrupt one).
- **Simulating corruption for the demo:** a debug/admin endpoint (or CLI flag) lets the operator directly flip bytes in a node's on-disk file, or call a node's `POST /internal/inject-corruption/{object_id}` test hook, to make the next scrub cycle (or read) catch it live in the dashboard.

---

## 11. Automatic Replica Repair

The **Repair Manager** runs as a periodic loop on the Coordinator (e.g., every `REPAIR_INTERVAL` = 5–10s for demo responsiveness):

1. Query metadata for objects where `current_replica_count < replication_factor` (due to `MISSING` or `SUSPECTED_CORRUPT` replicas) — these are `UNDER_REPLICATED` or `DEGRADED`.
2. For each such object:
   a. Pick one known-good (`SYNCED`) source replica.
   b. Pick a new target node via the Placement Engine (excluding nodes already holding a copy).
   c. Instruct the target node to pull the object from the source node (`POST /internal/replicate` with `{object_id, source_node}`), or have the Coordinator stream it through itself if direct node-to-node isn't implemented in time.
   d. Target node verifies checksum after pulling; on success, Coordinator updates `replica_locations` to add the new `SYNCED` entry.
3. Repairs are rate-limited (max concurrent repair jobs, e.g. 3–5 at a time) to avoid saturating the network during mass-failure scenarios — a simple but important nod to minimizing "recovery time and storage overhead" as required by the problem statement.
4. Repair priority: objects with the **fewest remaining healthy replicas** are repaired first (an object down to its last copy is more urgent than one that lost 1 of 3).

This loop is also what makes the system self-healing after both node failure and corruption — both problems reduce to "this object doesn't have enough good replicas, go make more."

---

## 12. Background Rebalancing

Separate from repair (which restores lost replicas), **rebalancing** redistributes existing healthy replicas for better load/capacity balance — triggered when:
- A new node joins the cluster (should receive some share of existing objects over time).
- Nodes become significantly imbalanced in disk usage (e.g., one node >80% full while another is <20%).

Rebalancing loop (lower priority than repair, runs less frequently, e.g. every 30–60s):
1. Compute average utilization across `HEALTHY` nodes.
2. For nodes above a high-water mark, pick some replicas to migrate to nodes below a low-water mark.
3. Migration = same mechanism as repair (pull to new node, verify checksum, update metadata, then delete the old copy from the source once the new copy is confirmed `SYNCED`).
4. Rebalancing never drops below `replication_factor` mid-move (copy-then-delete, never delete-then-copy).

**Why rebalancing is deprioritized relative to repair:** Data durability (having enough healthy copies) matters more than data placement optimality. If both are needed simultaneously (e.g., after a node comes back from failure), repair jobs always run first.

---

## 13. Concurrency Model (Concurrent Reads/Writes)

- **Concurrent reads** of the same object are trivially safe — reads are non-destructive and can be served by any number of nodes/clients simultaneously.
- **Concurrent writes to the same key (overwrite):**
  - The Coordinator serializes metadata commits for a given `object key` using a per-key lock (e.g., an in-process mutex keyed by object key, since there's only one Coordinator instance).
  - Each write is assigned a monotonically increasing `version` number at commit time.
  - Last-writer-wins at the metadata level: whichever write acquires the commit lock second (by wall-clock arrival at the Coordinator) becomes the new current version; the loser's replicas that already landed on nodes become orphaned and are garbage-collected on the next scrub/rebalance pass.
  - This is a deliberate simplification of real conflict resolution (no vector clocks / CRDTs) — acceptable because the problem statement doesn't require multi-writer conflict merging, just "handle concurrent reads and writes" without corrupting data.
- **Concurrent writes to different keys** proceed fully in parallel — no global lock.
- **Deletes** are handled as tombstones: metadata `status = DELETED` is set immediately (so it stops appearing in reads/lists), and actual byte deletion from nodes happens asynchronously via a background cleanup job (simplifies making delete "immediately consistent" from the API's point of view without needing synchronous fan-out delete to all replicas).

---

## 14. Simulating Failures for the Hackathon Demo

A dedicated **Failure Injection** capability (either a CLI tool, or endpoints on a "chaos" admin API) lets the team live-demo fault tolerance:

| Failure type | How it's simulated |
|---|---|
| Node crash | Kill the node's process/container (`docker stop node-b`) |
| Node slow/unresponsive | Node process sleeps before responding (injected via debug flag/header) |
| Network partition | Docker network disconnect, or a toxiproxy/iptables rule blocking Coordinator ↔ Node traffic |
| Data corruption | Admin endpoint flips bytes in a stored object file on a node, or writes garbage directly to the file on disk |
| Disk full / node overloaded | Node reports artificially high `used_bytes` in its heartbeat to force rebalancing behavior |

All of these are exposed through the **Dashboard** as buttons ("Kill Node B", "Corrupt object X on Node A", "Partition Node C") so the demo can visibly show: object still readable → node killed → dashboard shows RED → repair triggers → dashboard shows GREEN again, all within seconds.

---

## 15. Dashboard Requirements

A web dashboard (read-mostly, polling or WebSocket-based) should show, at minimum:
1. **Cluster view:** list of all nodes with status (`HEALTHY`/`SUSPECTED`/`DEAD`), capacity used, last heartbeat time.
2. **Object view:** list/search of objects with their replication factor, current replica count, and status (`ACTIVE`/`UNDER_REPLICATED`/`DEGRADED`).
3. **Object detail:** which nodes currently hold a given object's replicas, and each replica's status/checksum/last-verified time.
4. **Live event log:** stream of system events — heartbeat lost, node marked dead, corruption detected, repair started/completed, rebalance started/completed.
5. **Chaos controls:** buttons to kill/restart a node, inject corruption on a specific object/node, and simulate a partition (as in §14).
6. **(Nice to have)** basic charts: replicas-over-time, repair latency, cluster capacity over time.

This is the primary judge-facing artifact — it should make the invisible (replication, failure detection, repair) visible.

---

## 16. Local Development & Deployment Architecture

For the hackathon, the whole system runs **locally via Docker Compose**:

```yaml
# conceptual docker-compose layout
services:
  coordinator:
    build: ./coordinator
    ports: ["8000:8000"]
    volumes: ["./data/coordinator:/data"]   # SQLite file lives here

  node-a:
    build: ./storage-node
    environment: [NODE_ID=node-a]
    volumes: ["./data/node-a:/data"]

  node-b:
    build: ./storage-node
    environment: [NODE_ID=node-b]
    volumes: ["./data/node-b:/data"]

  node-c:
    build: ./storage-node
    environment: [NODE_ID=node-c]
    volumes: ["./data/node-c:/data"]

  node-d:
    build: ./storage-node
    environment: [NODE_ID=node-d]
    volumes: ["./data/node-d:/data"]

  dashboard:
    build: ./dashboard
    ports: ["3000:3000"]
```

- Each Storage Node is the same codebase, parameterized by `NODE_ID` and a data directory — this makes it trivial to spin up as many nodes as desired (recommend **4–5 nodes** for a demo: enough to show replication factor 3 with room for one to fail).
- The Coordinator's metadata DB (SQLite) persists to a mounted volume so it survives restarts during development.
- All services communicate over the Docker Compose internal network by service name (`http://node-a:8080`, etc.), which also makes "network partition" simulation easy via `docker network disconnect`.
- No external cloud dependencies required — the whole thing runs on a laptop.

---

## 17. Recommended Technology Stack

| Layer | Recommendation | Why |
|---|---|---|
| Coordinator & Storage Node language | **Python (FastAPI)** or **Node.js (Express/Fastify)** | Fast to iterate on in a hackathon; both teams likely already know one of these; async support handles concurrent node I/O well. |
| Metadata store | **SQLite** (embedded) | Zero setup, transactional, plenty for hundreds/thousands of objects; trivially gives single-writer consistency. |
| Storage Node object storage | **Local filesystem** | Simplest possible "storage engine"; no need for a custom on-disk format for a prototype. |
| Checksums | **SHA-256** (stdlib in Python/Node) | Explicitly required by the problem statement; fast enough, cryptographically strong, no extra dependency. |
| Inter-service communication | **REST over HTTP/JSON** | Simple to implement, debug (curl-able), and demo; gRPC/binary protocols add complexity with no real demo benefit at this scale. |
| Dashboard | **React + a lightweight charting lib (e.g., Recharts)**, polling the Coordinator's REST API (or a WebSocket for live event log) | Fast to build, good live-demo visuals. |
| Containerization | **Docker + Docker Compose** | Lets us spin up N identical storage node containers and simulate real "independent, failing nodes" locally; also the simplest way to demo network partitions. |
| Failure injection | **Custom lightweight chaos endpoints** on nodes/Coordinator, or Docker/network commands | No need for a heavyweight chaos-engineering tool (e.g., Chaos Mesh) at this scale — homemade toggles are more controllable for a live demo anyway. |

---

## 18. Key Design Decisions — Summary

| Decision | Reasoning |
|---|---|
| Single logical Coordinator (not distributed metadata) | Keeps metadata strongly consistent with minimal engineering effort; accepted tradeoff of a SPOF, documented in Limitations. |
| Quorum writes (majority), single-replica fast reads | Balances availability under failure with implementation simplicity; strong-consistency read mode offered as a stretch goal. |
| Timeout-based failure detection | Simple to implement and to demo predictably; sufficient for a controlled hackathon network. |
| Partition treated same as node failure | Avoids implementing split-brain detection; safe because there's only one Coordinator. |
| SHA-256 checksums at write, read, and background scrub | Directly satisfies the "integrity verification / detect corrupted replicas" requirement with a single, well-understood mechanism reused three ways. |
| Repair prioritized over rebalancing | Durability (enough copies) is more urgent than optimal placement. |
| Last-writer-wins for concurrent overwrites (no CRDTs/vector clocks) | Problem statement requires "handling" concurrency, not multi-writer conflict merging; keeps the write path simple. |
| Docker Compose for local deployment | Zero-cost way to simulate "independently failing nodes" and network partitions on a single laptop. |

---

## 19. Limitations of the Prototype (Explicitly Out of Scope)

- **Coordinator is a single point of failure.** No leader election / Raft-based coordinator failover is implemented. A production version would run multiple Coordinators with a consensus protocol (Raft/etcd) for metadata.
- **No true split-brain / partial-partition handling** — the Coordinator cannot distinguish "node is dead" from "node is merely unreachable from me," and doesn't attempt cross-node gossip to find out.
- **No Byzantine fault tolerance** — nodes are assumed to fail by crashing or corrupting data, not by acting maliciously/adversarially.
- **No multi-writer conflict resolution** — overwrites use last-writer-wins, not CRDTs or application-level merge.
- **No rack/zone/datacenter-aware placement** — placement only considers node capacity, not physical failure-domain diversity.
- **No real "large volume" scale testing** — the prototype is validated for correctness and behavior under failure, not for throughput/scale (e.g., no sharded metadata, no erasure coding — replication only, not more storage-efficient redundancy schemes).
- **No authentication/authorization or encryption at rest/in transit** — out of scope for a hackathon demo focused on the distributed-systems mechanics.
- **No client-side SDK library** beyond simple HTTP calls documented in `API.md`.

These are called out explicitly so the team, and judges, understand they are deliberate scoping decisions, not oversights.
