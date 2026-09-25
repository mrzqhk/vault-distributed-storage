import React from 'react';
import { 
  Database, 
  HardDrive, 
  Files, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Server, 
  AlertCircle 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StorageNodesTable from '../components/StorageNodesTable';
import ObjectsTable from '../components/ObjectsTable';
import ClusterVisualization from '../components/ClusterVisualization';
import RepairJobsTable from '../components/RepairJobsTable';
import ActivityLog from '../components/ActivityLog';

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-900/60 text-cyan-400 border border-cyan-700/50 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              VAULT DISTRIBUTED STORAGE — COORDINATOR &amp; 3 STORAGE NODES
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Replication active: <code className="text-cyan-400">POST /api/v1/objects</code> fans out to node-1 (9001), node-2 (9002), node-3 (9003). Factor N = 3.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 self-end sm:self-center">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            PHASE 2 ACTIVE
          </span>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Cluster Health */}
        <StatCard
          title="Cluster Health"
          value="3 / 3"
          subtext="All Storage Nodes Healthy"
          icon={Activity}
          accentColor="emerald"
        />

        {/* Total Storage */}
        <StatCard
          title="Storage Usage"
          value="—"
          subtext="Grows as objects are uploaded"
          icon={HardDrive}
          accentColor="cyan"
        />

        {/* Stored Objects */}
        <StatCard
          title="Total Objects"
          value="—"
          subtext="Upload to see object count"
          icon={Files}
          accentColor="indigo"
        />

        {/* Replication Health */}
        <StatCard
          title="Replication"
          value="N = 3"
          subtext="3 nodes — W=3, R=1"
          icon={Layers}
          accentColor="amber"
        />

        {/* Integrity Check */}
        <StatCard
          title="Integrity (SHA-256)"
          value="Verified"
          subtext="Checksum on every write"
          icon={ShieldCheck}
          accentColor="emerald"
        />
      </div>

      {/* Cluster Topology & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClusterVisualization />
        <ActivityLog />
      </div>

      {/* Storage Nodes Table */}
      <StorageNodesTable />

      {/* Objects & Storage Files Table */}
      <ObjectsTable />

      {/* Self-Healing Repair Jobs Table */}
      <RepairJobsTable />
    </div>
  );
}
