import React from 'react';
import { Server, HardDrive, Wifi, ShieldCheck, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DEMO_NODES = [
  {
    node_id: 'node-1',
    hostname: 'localhost',
    address: 'localhost:9001',
    status: 'healthy',
    used_bytes: 0,
    capacity_bytes: 10737418240, // 10 GB
    object_count: 0,
    last_heartbeat: 'Running'
  },
  {
    node_id: 'node-2',
    hostname: 'localhost',
    address: 'localhost:9002',
    status: 'healthy',
    used_bytes: 0,
    capacity_bytes: 10737418240, // 10 GB
    object_count: 0,
    last_heartbeat: 'Running'
  },
  {
    node_id: 'node-3',
    hostname: 'localhost',
    address: 'localhost:9003',
    status: 'healthy',
    used_bytes: 0,
    capacity_bytes: 10737418240, // 10 GB
    object_count: 0,
    last_heartbeat: 'Running'
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
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white">
              Storage Nodes
            </h3>
            <p className="text-xs text-slate-400">Coordinator &amp; 3 Storage Nodes — localhost</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          3 Active Nodes
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
          Node capacity stats update as objects are uploaded via <code className="text-cyan-600">POST /api/v1/objects</code>.
        </span>
      </div>
    </div>
  );
}
