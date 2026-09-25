import React from 'react';
import { Network, Server, Database, Radio, Shield } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ClusterVisualization() {
  const nodes = [
    { id: 'node-a', name: 'Node A', port: '8001', status: 'healthy', angle: 45 },
    { id: 'node-b', name: 'Node B', port: '8002', status: 'healthy', angle: 135 },
    { id: 'node-c', name: 'Node C', port: '8003', status: 'healthy', angle: 225 },
    { id: 'node-d', name: 'Node D', port: '8004', status: 'degraded', angle: 315 },
  ];

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white flex items-center gap-2">
              Live Cluster Visualization
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                TOPOLOGY PLACEHOLDER
              </span>
            </h3>
            <p className="text-xs text-slate-400">Coordinator & Storage Nodes mesh architecture</p>
          </div>
        </div>
      </div>

      {/* Visual Mesh Canvas */}
      <div className="relative my-6 py-6 flex items-center justify-center min-h-[220px]">
        {/* Subtle radial grid lines */}
        <div className="absolute w-48 h-48 rounded-full border border-slate-800/80 animate-pulse pointer-events-none" />
        <div className="absolute w-72 h-72 rounded-full border border-slate-800/40 pointer-events-none" />

        {/* Center Coordinator */}
        <div className="z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-900/80 to-blue-900/80 border-2 border-cyan-400/80 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Database className="w-7 h-7 text-cyan-300" />
          </div>
          <span className="mt-2 text-xs font-mono font-bold text-white tracking-wide">
            COORDINATOR
          </span>
          <span className="text-[10px] font-mono text-cyan-400">
            Port 8000 (Active)
          </span>
        </div>

        {/* Connected Storage Nodes */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-4 sm:px-12">
          {/* Left pair */}
          <div className="flex flex-col justify-between h-full py-2 pointer-events-auto">
            {/* Node A */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-a</div>
                <div className="text-[10px] text-slate-400">:8001</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* Node C */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-c</div>
                <div className="text-[10px] text-slate-400">:8003</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Right pair */}
          <div className="flex flex-col justify-between h-full py-2 pointer-events-auto">
            {/* Node B */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-b</div>
                <div className="text-[10px] text-slate-400">:8002</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            {/* Node D */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-amber-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-d</div>
                <div className="text-[10px] text-slate-400">:8004</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          Replication Factor: N=3 (Default)
        </span>
        <span className="text-slate-500">
          Heartbeat interval: 3s
        </span>
      </div>
    </div>
  );
}
