import React from 'react';
import { Server, HardDrive, Wifi, ShieldCheck, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DEMO_NODES = [
  {
    node_id: 'node-a',
    hostname: 'vault-node-a',
    address: '127.0.0.1:8001',
    status: 'healthy',
    used_bytes: 2147483648, // 2 GB
    capacity_bytes: 10737418240, // 10 GB
    object_count: 42,
    last_heartbeat: 'Just now'
  },
  {
    node_id: 'node-b',
    hostname: 'vault-node-b',
    address: '127.0.0.1:8002',
    status: 'healthy',
    used_bytes: 1073741824, // 1 GB
    capacity_bytes: 10737418240, // 10 GB
    object_count: 30,
    last_heartbeat: '2s ago'
  },
  {
    node_id: 'node-c',
    hostname: 'vault-node-c',
    address: '127.0.0.1:8003',
    status: 'healthy',
    used_bytes: 3221225472, // 3 GB
    capacity_bytes: 10737418240, // 10 GB
    object_count: 55,
    last_heartbeat: '1s ago'
  },
  {
    node_id: 'node-d',
    hostname: 'vault-node-d',
    address: '127.0.0.1:8004',
    status: 'degraded',
    used_bytes: 536870912, // 512 MB
    capacity_bytes: 10737418240, // 10 GB
    object_count: 14,
    last_heartbeat: '8s ago'
  }
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function StorageNodesTable() {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white flex items-center gap-2">
              Storage Nodes
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                DEMO PLACEHOLDER
              </span>
            </h3>
            <p className="text-xs text-slate-400">Cluster storage node members and capacity</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          4 Simulated Nodes (Phase 1 UI)
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 font-mono">
              <th className="py-2.5 px-3">Node</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Address</th>
              <th className="py-2.5 px-3">Utilization</th>
              <th className="py-2.5 px-3">Objects</th>
              <th className="py-2.5 px-3">Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {DEMO_NODES.map((node) => {
              const usagePercent = Math.round((node.used_bytes / node.capacity_bytes) * 100);
              return (
                <tr key={node.node_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-white">{node.node_id}</span>
                      <span className="text-[11px] text-slate-500 font-sans hidden lg:inline">({node.hostname})</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={node.status} />
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {node.address}
                  </td>
                  <td className="py-3 px-3">
                    <div className="w-32 sm:w-40">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{formatBytes(node.used_bytes)}</span>
                        <span>{usagePercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usagePercent > 80 ? 'bg-amber-400' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {node.object_count}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {node.last_heartbeat}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          Real storage node daemon processes and heartbeat protocol will be attached in Phase 2.
        </span>
      </div>
    </div>
  );
}
