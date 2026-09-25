import React from 'react';
import { Network, Server, Database, Radio } from 'lucide-react';

const NODES = [
  { id: 'node-1', port: '9001', status: 'healthy' },
  { id: 'node-2', port: '9002', status: 'healthy' },
  { id: 'node-3', port: '9003', status: 'healthy' },
];

export default function ClusterVisualization() {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white">
              Live Cluster Topology
            </h3>
            <p className="text-xs text-slate-400">Coordinator &amp; 3 Storage Nodes — localhost</p>
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
            localhost:8000
          </span>
        </div>

        {/* Connected Storage Nodes — node-1 left top, node-2 right, node-3 left bottom */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-4 sm:px-12">
          {/* Left column: node-1 and node-3 */}
          <div className="flex flex-col justify-between h-full py-4 pointer-events-auto">
            {/* node-1 */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-1</div>
                <div className="text-[10px] text-slate-400">localhost:9001</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* node-3 */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-3</div>
                <div className="text-[10px] text-slate-400">localhost:9003</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Right column: node-2 centered */}
          <div className="flex flex-col items-end justify-center h-full py-4 pointer-events-auto">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 shadow-md">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono">
                <div className="font-semibold text-white">node-2</div>
                <div className="text-[10px] text-slate-400">localhost:9002</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          Replication Factor: N = 3
        </span>
        <span className="text-slate-500">
          3 nodes configured
        </span>
      </div>
    </div>
  );
}
