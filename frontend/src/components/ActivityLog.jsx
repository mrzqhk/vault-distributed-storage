import React from 'react';
import { Terminal } from 'lucide-react';

export default function ActivityLog() {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white">
              Recent System Activity
            </h3>
            <p className="text-xs text-slate-400">Live events from Coordinator &amp; Storage Nodes</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 flex flex-col items-center justify-center min-h-[180px] text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-mono text-slate-400">No events yet</p>
          <p className="text-xs text-slate-600 mt-1">Live events will appear here as objects are uploaded and replicated.</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
        Events stream from <code className="text-cyan-600">GET /api/v1/objects</code> — upload a file to see activity.
      </div>
    </div>
  );
}
