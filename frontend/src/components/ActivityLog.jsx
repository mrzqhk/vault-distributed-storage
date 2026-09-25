import React from 'react';
import { Terminal, Shield, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const DEMO_EVENTS = [
  {
    id: 1,
    time: '02:24:12',
    level: 'info',
    source: 'Coordinator',
    message: 'Health probe sweep completed: 4/4 nodes responding.'
  },
  {
    id: 2,
    time: '02:22:45',
    level: 'warn',
    source: 'HealthMonitor',
    message: 'Storage node-d missed 1 heartbeat cycle (latency spike).'
  },
  {
    id: 3,
    time: '02:20:00',
    level: 'info',
    source: 'RepairEngine',
    message: 'Enqueued repair job-77a1: re-replicating backups/db_snapshot.tar.gz'
  },
  {
    id: 4,
    time: '02:18:30',
    level: 'info',
    source: 'ScrubWorker',
    message: 'Background scrub passed for node-a (42 objects, 0 checksum errors).'
  },
  {
    id: 5,
    time: '02:15:10',
    level: 'info',
    source: 'Coordinator',
    message: 'Cluster metadata store synchronized with SQLite engine.'
  }
];

export default function ActivityLog() {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white flex items-center gap-2">
              Recent System Activity
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                LOG PLACEHOLDER
              </span>
            </h3>
            <p className="text-xs text-slate-400">Audit trail of cluster events & self-healing operations</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto max-h-[260px] font-mono text-xs pr-1">
        {DEMO_EVENTS.map((evt) => (
          <div 
            key={evt.id} 
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5 hover:bg-slate-900 transition-colors"
          >
            <span className="text-[10px] text-slate-500 flex-shrink-0 pt-0.5">
              {evt.time}
            </span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase flex-shrink-0 ${
              evt.level === 'warn' 
                ? 'bg-amber-950/70 text-amber-400 border border-amber-800' 
                : 'bg-cyan-950/70 text-cyan-400 border border-cyan-800'
            }`}>
              {evt.source}
            </span>
            <span className="text-slate-300 text-xs leading-tight">
              {evt.message}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
        Streaming websocket log per API.md §13 will connect in Phase 2.
      </div>
    </div>
  );
}
