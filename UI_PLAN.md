# Vault — UI / Dashboard Plan

**Owner:** Rishvan
**Scope:** Planning only. No frontend code, no implementation.
**Goal:** A simple, minimal, visually clear dashboard that lets a demo user *see* system health and *interact* with the storage system without noise.

---

## 1. Design Philosophy

- One primary screen (Dashboard) + one secondary screen (Object detail / drill-down). No sprawling multi-page app.
- Everything answers one question at a glance: **"Is Vault healthy right now?"**
- Every visual element maps to a real API call. Nothing decorative, nothing fake.
- Status is always color-coded and consistent across the whole app:
  - 🟢 Healthy / Online / Completed
  - 🟡 Warning / Repairing / Degraded
  - 🔴 Failed / Offline / Corrupted
  - ⚪ Unknown / Pending

---

## 2. Screens

### Screen A — Main Dashboard (single page, scrollable sections)
Contains sections 1–4 and 8 below, all visible without navigation.

### Screen B — Object Detail (modal or side panel, not a full page)
Opens when a user clicks an object row. Shows replica map, checksum status, repair history for that one object. Kept as a panel (not a route) to keep screen count low.

No other screens are needed. Node failure simulation and repair status live as widgets inside Screen A, not separate pages.

---

## 3. Components

Each component below lists: what the user sees, what they can do, the API endpoint it depends on (naming convention only — **actual endpoint names/fields are a dependency on Haya's API.md**), what data it needs, and what happens after interaction.

### 3.1 System Overview Bar (top of Screen A)
- **Sees:** 4 compact stat cards — Total Storage Used/Capacity, Total Objects, Replication Health %, Overall System Status badge.
- **Can do:** Nothing interactive here — read-only summary.
- **API:** `GET /system/status` (dependency: confirm exact route/fields with Haya).
- **Data needed:** total capacity, used bytes, object count, healthy-replica ratio, aggregate health enum.
- **After interaction:** Auto-refreshes on a poll interval (e.g., every 5–10s) or on relevant events (see §7 real-time note). No click action.

### 3.2 Storage Nodes Table
- **Sees:** Table/grid of node cards — Node ID, status badge (online/offline), storage used vs capacity (small bar), last-heartbeat time.
- **Can do:** Click a node to expand details (which objects/replicas it holds, if the API exposes this). Nothing destructive here.
- **API:** `GET /nodes` (list), optionally `GET /nodes/{id}` for expanded view.
- **Data needed:** node id/name, status, capacity, used, last heartbeat, health flag.
- **After interaction:** Expands inline row (no navigation); refreshes on poll/event.

### 3.3 Objects/Files Table
- **Sees:** Table of stored objects — name, size, replication factor, health badge (all replicas healthy / degraded / corrupted), last modified.
- **Can do:**
  - **Upload** via a button + file picker → progress indicator.
  - **Download** via a button per row.
  - **Click row** → opens Object Detail panel (Screen B).
- **API:** `GET /objects` (list), `POST /objects` (upload), `GET /objects/{id}/download`, `GET /objects/{id}` (detail).
- **Data needed:** object id, name, size, content-type (if available), replication factor, health status, timestamps.
- **After interaction:**
  - Upload: shows progress bar → success/failure toast → table row appears/updates.
  - Download: browser downloads file; no state change.
  - Row click: opens detail panel with replica map.

### 3.4 Replication Panel (inside Object Detail, Screen B)
- **Sees:** Configured replication factor for the object, list of replica locations (node IDs) with per-replica health badge.
- **Can do:** Read-only. (Dependency: whether manual "re-replicate" trigger is exposed by backend — if yes, add a "Repair now" button here, otherwise omit.)
- **API:** `GET /objects/{id}/replicas`.
- **Data needed:** replica list with node id, status (in-sync/stale/corrupted/missing), last verified time.
- **After interaction:** N/A unless repair-trigger exists (see 3.6).

### 3.5 Integrity Status (badge inside Objects table row + detail panel)
- **Sees:** A checksum/integrity badge per object and per replica (Verified / Corrupted / Pending Verification).
- **Can do:** Read-only indicator; optionally a "Verify now" button if the backend supports on-demand checksum verification (mark as dependency if uncertain).
- **API:** part of `GET /objects/{id}` or a dedicated `GET /objects/{id}/integrity` (dependency: confirm with Thahseen/Haya whether this is a separate field or endpoint).
- **Data needed:** checksum match boolean/enum per replica, last verified timestamp.
- **After interaction:** If verify-now exists: triggers job, shows "Pending" state, updates on completion event.

### 3.6 Repair Panel
- **Sees:** A compact card listing active repair jobs — target object/replica, progress (bar or %), source/destination node, status (Repairing/Completed/Failed).
- **Can do:** Read-only by default. If backend supports manual trigger, include a "Repair now" button next to a degraded object/replica (dependency — do not invent if no such endpoint exists).
- **API:** `GET /repairs` (active + recent jobs), optionally `POST /repairs` if manual trigger is supported.
- **Data needed:** job id, target object/replica, source node, destination node, progress %, status, start/end time.
- **After interaction:** Progress bar updates live (poll or event); on completion, job moves from "Active" to "Recent" list with a clear success/failure marker.

### 3.7 Failure Simulation Widget
- **Sees:** A small control card listing nodes with a toggle/button per node: "Simulate Failure" / "Recover Node".
- **Can do:** Click to mark a node as failed or recovered, for demo purposes only.
- **API:** `POST /nodes/{id}/simulate-failure`, `POST /nodes/{id}/recover` (dependency: this endpoint must exist in the backend; if it doesn't, this widget is disabled/hidden — do not fake it client-side).
- **Data needed:** node id, current simulated state.
- **After interaction:** Node status badge updates (Storage Nodes table) → triggers real replication/repair flow if backend implements it → Activity Log shows the event.

### 3.8 Activity / Event Log
- **Sees:** A short, chronological list (last ~10–15 events) — e.g. "Node-3 went offline", "Corruption detected on Object X", "Repair started", "Repair completed".
- **Can do:** Read-only, scrollable list. No pagination needed for a hackathon demo.
- **API:** `GET /events` (or `GET /activity`) — ideally backed by a WebSocket/SSE stream if backend supports it; otherwise poll.
- **Data needed:** event id, type, message/summary, severity, timestamp.
- **After interaction:** New events prepend to the top automatically; older items scroll off or are truncated.

---

## 4. Technology Recommendation

**Recommended: React + Vite + Tailwind CSS**, with a small charting/UI-kit addition (e.g. Recharts for the storage-usage chart, and simple badge/table components hand-rolled or from a lightweight kit).

**Why:**
- Fast to scaffold for a hackathon (Vite dev server, hot reload).
- Component model matches this plan naturally (NodeCard, ObjectRow, StatusBadge, etc. — reusable, isolated).
- Tailwind gives a polished look quickly without hand-writing CSS, which matters when time is short.
- Large ecosystem for polling/WebSocket data fetching (native `fetch`/`EventSource`, or a small hook-based data layer) — no heavy state-management library needed for a dashboard this size.
- Avoids over-engineering: no need for Next.js routing/server-rendering since this is a single-page internal tool for a demo.

If the team is more comfortable with something even lighter for a time-boxed prompt-a-thon, plain **HTML + Alpine.js + Tailwind** is a fallback — less setup, still gives reactive UI without a build step. React is preferred if any team member already knows it, since component reuse maps directly to §5 below.

---

## 5. Suggested Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Vault  •  System Status: 🟢 Healthy        [Simulate ▾] │  ← header + global status + failure sim entry
├─────────────────────────────────────────────────────────┤
│  [Total Storage] [Objects] [Replication %] [Health]      │  ← Overview stat cards (3.1)
├───────────────────────────────┬───────────────────────────┤
│  Storage Nodes (3.2)          │  Activity Log (3.8)        │
│  table/grid of node cards      │  scrolling event feed      │
├───────────────────────────────┴───────────────────────────┤
│  Objects / Files (3.3)                          [Upload]  │
│  table: name | size | replicas | health | actions          │
├─────────────────────────────────────────────────────────┤
│  Repair Jobs (3.6)  — active + recent, progress bars       │
└─────────────────────────────────────────────────────────┘

Object row click → side panel slides in:
┌─────────────────────────┐
│ Object: filename.ext     │
│ Replication factor: 3    │
│ Replicas: [Node1 🟢]     │
│           [Node2 🟢]     │
│           [Node3 🟡]     │
│ Integrity: ✅ Verified   │
│ [Download]               │
└─────────────────────────┘
```

Single scrollable page, two-column split only for Nodes/Activity (side by side), everything else full-width stacked. This keeps the whole system visible in 1–2 screen-heights.

---

## 6. Essential Reusable Components

1. **StatusBadge** — colored pill (healthy/warning/failed/repairing/completed/unknown). Used everywhere.
2. **StatCard** — icon + label + value, used in Overview bar.
3. **NodeCard / NodeRow** — node id, status, usage bar.
4. **ObjectRow** — object metadata + inline actions (download, click-to-expand).
5. **ProgressBar** — used for storage usage and repair progress.
6. **EventItem** — single line in the Activity Log with icon + timestamp.
7. **SidePanel** — generic slide-in container, reused for Object Detail.
8. **UploadButton** — file picker + progress feedback.

Building these once and reusing them keeps the UI visually consistent with minimal code.

---

## 7. Basic User Flow

1. User opens dashboard → sees Overview + Node grid + Object table + Activity log immediately (no login flow assumed for a hackathon demo, unless auth is required — dependency).
2. User uploads a file → sees it appear in Objects table with replication factor and health badge.
3. User clicks the object → side panel shows replica locations and integrity status.
4. User (or judge) triggers a simulated node failure → Node badge turns red → Activity log logs the event → affected object's replica health degrades.
5. Backend detects the failure and starts self-healing (if implemented) → Repair panel shows an active job with progress → Activity log logs "Repair started."
6. Repair completes → Repair panel marks job Completed → Object's replica health returns to green → Activity log logs "Repair completed."
7. User can recover the simulated node manually if needed, or the system marks it healthy again automatically once heartbeats resume.

---

## 8. Demo Flow for Presenting Vault

A tight ~3–4 minute walkthrough:

1. **Open dashboard** — "Here's Vault, a distributed object store. Everything you see maps directly to a real API call."
2. **Upload a file** — show it land in the Objects table, replicated across N nodes.
3. **Show replication** — click the object, show 3 healthy replicas across different nodes.
4. **Simulate a node failure** — click "Simulate Failure" on the node holding one replica. Show the node turn red immediately, and the object's replica badge degrade.
5. **Show self-healing** — point at the Repair panel: a job appears, progress bar fills, Activity log narrates it live.
6. **Show recovery** — repair completes, everything goes back to green, object still fully available throughout (no downtime for the user).
7. **Close on the Overview bar** — "At a glance, the system is healthy, fully replicated, and self-repairing."

This flow deliberately exercises every backend guarantee (replication, failure handling, repair, integrity) through UI the judges can see without reading logs.

---

## 9. Frontend/Backend Integration Requirements

- **Confirmed dependency, not invented:** exact endpoint paths, request/response schemas, and auth (if any) must come from Haya's `API.md` before wiring components — the endpoint names above are placeholders describing intent, not final contracts.
- **Data refresh strategy:** prefer a lightweight polling interval (5–10s) for MVP; upgrade to WebSocket/SSE for the Activity Log and Repair progress only if backend time allows — do not build this speculatively.
- **CORS:** backend must allow the frontend's dev origin during the hackathon.
- **Failure simulation endpoint:** must exist server-side; if it doesn't, the Failure Simulation widget (3.7) is dropped from the demo rather than faked client-side.
- **Consistent status enums:** frontend badges assume the backend returns a small fixed set of status strings (e.g. `healthy | degraded | failed | repairing | unknown`) — this vocabulary should be agreed with Thahseen's DATABASE.md and Haya's API.md so the same enum is used end-to-end.
- **No client-side invented fields:** any metadata shown (size, timestamps, checksums) must come directly from the API/DB schema — nothing fabricated for visual polish.

---

## 10. Open Dependencies (to confirm with Haya / Thahseen)

- [ ] Exact API routes/fields for: system status, node list, object list/upload/download, replica list, integrity/checksum status, repair jobs, node failure simulation, activity/events.
- [ ] Whether on-demand "Verify now" and manual "Repair now" actions are supported, or purely automatic.
- [ ] Whether real-time updates are available (WebSocket/SSE) or polling-only.
- [ ] Whether authentication is in scope for the demo.
- [ ] Fixed status enum vocabulary shared across DB, API, and UI.
