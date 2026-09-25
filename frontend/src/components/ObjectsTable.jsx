import React from 'react';
import { Files, FileText, Upload, Download, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DEMO_OBJECTS = [
  {
    object_id: '3f1a9e2c-4b5a-4e89-b1d2-9f0a8c7e1234',
    key: 'photos/cluster_diagram.png',
    size_bytes: 204800, // 200 KB
    version: 1,
    replication_factor: 3,
    replica_count: 3,
    status: 'active',
    integrity: 'verified',
    updated_at: '2026-09-26 01:45'
  },
  {
    object_id: '8a2b3c4d-5e6f-7081-92a3-b4c5d6e7f890',
    key: 'reports/q3_resilience_audit.pdf',
    size_bytes: 1450000, // 1.45 MB
    version: 2,
    replication_factor: 3,
    replica_count: 3,
    status: 'active',
    integrity: 'verified',
    updated_at: '2026-09-26 02:10'
  },
  {
    object_id: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
    key: 'backups/db_snapshot.tar.gz',
    size_bytes: 52428800, // 50 MB
    version: 1,
    replication_factor: 3,
    replica_count: 2,
    status: 'degraded',
    integrity: 'verified',
    updated_at: '2026-09-26 02:15'
  }
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ObjectsTable() {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <Files className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono tracking-wide text-white">
              Objects &amp; Storage Files
            </h3>
            <p className="text-xs text-slate-400">Distributed object records and replication status</p>
          </div>
        </div>

        {/* Upload Button Placeholder */}
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 text-xs font-medium cursor-not-allowed"
          title="Use: curl -X POST http://localhost:8000/api/v1/objects -F 'file=@yourfile'"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>curl POST /api/v1/objects</span>
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 font-mono">
              <th className="py-2.5 px-3">Key / Path</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">Version</th>
              <th className="py-2.5 px-3">Replication</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Integrity (SHA-256)</th>
              <th className="py-2.5 px-3">Last Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {DEMO_OBJECTS.map((obj) => (
              <tr key={obj.object_id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-white">{obj.key}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {formatBytes(obj.size_bytes)}
                </td>
                <td className="py-3 px-3 text-slate-400">
                  v{obj.version}
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                    obj.replica_count < obj.replication_factor
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {obj.replica_count} / {obj.replication_factor} Replicas
                  </span>
                </td>
                <td className="py-3 px-3">
                  <StatusBadge status={obj.status} />
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    SHA-256 Verified
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-400 text-[11px]">
                  {obj.updated_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          Object CRUD available via <code className="text-cyan-600">POST /api/v1/objects</code>. Run curl or use any HTTP client.
        </span>
      </div>
    </div>
  );
}
