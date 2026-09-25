# VAULT — Fault-Tolerant Distributed Object Storage

Vault is a fault-tolerant distributed object storage system prototype designed for high resilience, automatic replication, checksum-based integrity verification, and self-healing repair.

> **IMPORTANT — PHASE 1 STATUS NOTICE:**  
> This codebase currently represents **PHASE 1 ONLY (Foundation & Scaffolding)**.  
> Distributed storage logic (real storage node processes, object chunking/streaming, replication quorum, failure detection heartbeats, background scrubbing, automated repair, and rebalancing) is **NOT implemented yet**. Phase 1 establishes the clean project architecture, Express backend, SQLite metadata schema, React/Vite control-plane UI shell, and the live `/api/health` connectivity contract.

---

## Project Structure

```
vault-distributed-storage/
├── ARCHITECTURE.md            # System architecture and design specification (Source of Truth)
├── API.md                     # REST API specification & contracts
├── DATABASE.md                # SQLite metadata schema and relationship model
├── UI_PLAN.md                 # UI/UX design specifications and layout plan
├── README.md                  # Project overview and setup instructions
├── backend/                   # Coordinator & Metadata Backend (Node.js + Express)
│   ├── .env                   # Local backend environment variables (git-ignored)
│   ├── .env.example           # Environment template
│   ├── package.json           # Backend dependencies and scripts
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # SQLite connection (better-sqlite3) & PRAGMA setup
│   │   │   └── env.js         # Environment configuration loader
│   │   ├── controllers/
│   │   │   └── health.controller.js # Health check controller
│   │   ├── middleware/
│   │   │   └── errorHandler.js# Centralized error handler (API.md format)
│   │   ├── models/
│   │   │   └── schema.js      # SQLite schema DDL (DATABASE.md tables)
│   │   ├── routes/
│   │   │   ├── health.routes.js # Route for /api/health
│   │   │   └── index.js       # Main API router
│   │   ├── services/
│   │   │   └── health.service.js# Health service
│   │   ├── utils/
│   │   │   └── logger.js      # Formatted logger utility
│   │   └── server.js          # Express server entry point
│   └── tests/
│       └── health.test.js     # Health endpoint and DB schema unit tests
└── frontend/                  # Control Plane Web Dashboard (React + Vite + Tailwind CSS)
    ├── .env                   # Local frontend environment variables (git-ignored)
    ├── .env.example           # Environment template
    ├── package.json           # Frontend dependencies and scripts
    ├── index.html             # Application HTML shell
    ├── vite.config.js         # Vite configuration
    ├── tailwind.config.js     # Tailwind CSS theme and dark palette
    ├── postcss.config.js      # PostCSS configuration
    └── src/
        ├── main.jsx           # React DOM root entry point
        ├── App.jsx            # Application router and layout shell
        ├── index.css          # Tailwind directives and styling
        ├── services/
        │   └── api.js         # API client with health checking
        ├── components/
        │   ├── Navbar.jsx               # Header with branding & navigation
        │   ├── SystemStatusBadge.jsx    # Live backend health connection badge
        │   ├── StatCard.jsx             # Reusable metric card with placeholder labels
        │   ├── StatusBadge.jsx          # Reusable status pill
        │   ├── StorageNodesTable.jsx    # Storage nodes grid (Placeholder)
        │   ├── ObjectsTable.jsx         # Objects file table (Placeholder)
        │   ├── ClusterVisualization.jsx # Mesh topology visualizer (Placeholder)
        │   ├── RepairJobsTable.jsx      # Self-healing queue (Placeholder)
        │   ├── ActivityLog.jsx          # Audit event log (Placeholder)
        │   └── VaultOpsAIModal.jsx      # VaultOps AI concept modal
        └── pages/
            ├── DashboardPage.jsx        # Main dashboard screen
            ├── LoginPage.jsx            # Operator login UI shell
            └── RegisterPage.jsx         # Operator registration UI shell
```

---

## System Requirements

- **Node.js**: v18.0.0 or higher (v24.x recommended)
- **npm**: v9.0.0 or higher (v11.x recommended)
- **OS**: Windows, macOS, or Linux

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `8000` | Port for the Express Coordinator backend |
| `DATABASE_PATH` | `./data/vault.db` | File path for SQLite metadata database |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin for CORS |
| `NODE_ENV` | `development` | Runtime environment (`development` / `production`) |

### Frontend (`frontend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Base URL for the backend API |

---

## Installation

### 1. Backend Installation

Navigate to the `backend/` directory and install dependencies:

```bash
cd backend
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

### 2. Frontend Installation

Navigate to the `frontend/` directory and install dependencies:

```bash
cd frontend
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

---

## Starting the Application

### 1. Start the Backend

From the `backend/` directory:

```bash
npm start
```

Or run in development mode with auto-reload:

```bash
npm run dev
```

The backend starts at `http://localhost:8000`.

### 2. Start the Frontend

In a separate terminal, from the `frontend/` directory:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Testing the Health Endpoint

### Direct Backend Check

With the backend running, test the health endpoint using `curl` or any browser:

```bash
curl http://localhost:8000/api/health
```

Expected JSON response:

```json
{
  "status": "ok",
  "service": "vault-backend"
}
```

### Running Backend Unit Tests

From the `backend/` directory:

```bash
npm test
```

This verifies:
1. Health service returns `{ status: "ok", service: "vault-backend" }`.
2. SQLite database initializes with all schema tables specified in `DATABASE.md` (`objects`, `object_versions`, `storage_nodes`, `replicas`, `checksums`, `repair_tasks`, `node_heartbeat_log`).

### Frontend Live Status Indicator Verification

1. Open `http://localhost:5173` in a web browser.
2. In the top navigation bar, observe the live status pill:
   - When the backend is running: **`🟢 Backend: Online (vault-backend)`**
   - When the backend is stopped: **`🔴 Backend: Offline (Failed to fetch)`**
3. Click the refresh icon on the badge to re-query `GET /api/health` on demand.

### Building Frontend for Production

From the `frontend/` directory:

```bash
npm run build
```

---

## Statement on Phase 1 Implementation Scope

The following systems are **INTENTIONALLY NOT IMPLEMENTED** in Phase 1 and belong to later phases:
- Object storage ingestion and file retrieval
- Real distributed storage node worker processes
- Multi-node replication & write quorum ($W = \lceil(N+1)/2\rceil$)
- Read quorum ($R = 1$) and failover mechanisms
- Node heartbeat sweeps and failure detection ($SUSPECTED$ / $DEAD$)
- SHA-256 background data scrubbers
- Automated replica repair worker loops
- Capacity-based cluster rebalancing
- Network partition simulation and chaos fault injection
- VaultOps AI autonomous operations engine
- Authentication backend & user session management
- Production containerized multi-node deployment
