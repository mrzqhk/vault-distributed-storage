import React from 'react';
import { Wrench, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DEMO_JOBS = [];

export default function RepairJobsTable() {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white">
              Self-Healing &amp; Repair Jobs
            </h3>
            <p className="text-xs text-slate-400">Active replica restoration & integrity reconciliation tasks</p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400">
              <th className="py-2.5 px-3">Job ID</th>
              <th className="py-2.5 px-3">Target Object</th>
              <th className="py-2.5 px-3">Task Type</th>
              <th className="py-2.5 px-3">Source &rarr; Target</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {DEMO_JOBS.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 text-xs font-mono">
                  No repair jobs — all replicas are healthy.
                </td>
              </tr>
            ) : DEMO_JOBS.map((job) => (
              <tr key={job.job_id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-3 text-cyan-400 font-semibold">
                  {job.job_id}
                </td>
                <td className="py-3 px-3 text-slate-200 truncate max-w-[160px]">
                  {job.object_key}
                </td>
                <td className="py-3 px-3 uppercase text-[11px] text-slate-400">
                  {job.type}
                </td>
                <td className="py-3 px-3 text-slate-400">
                  {job.source_node} &rarr; {job.target_node}
                </td>
                <td className="py-3 px-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="py-3 px-3">
                  <div className="w-24">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{job.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${job.progress === 100 ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
        Repair jobs will appear here if any replica becomes under-replicated or corrupt.
      </div>
    </div>
  );
}
