import React from 'react';
import { Bot, Sparkles, X, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export default function VaultOpsAIModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono tracking-wide text-white flex items-center gap-2">
                VaultOps AI Assistant
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                  Phase 2+ Concept
                </span>
              </h3>
              <p className="text-xs text-slate-400">Autonomous storage operations & diagnostics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400">
            <p className="font-mono text-cyan-400 text-xs mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Planned Capabilities (Post-Phase 1):
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-300">
              <li>Autonomous Node Remediation & predictive failure detection</li>
              <li>Dynamic Quorum & replication factor auto-tuning</li>
              <li>Heuristic Disk Balancing across asymmetric storage nodes</li>
              <li>Root-cause anomaly reporting on corrupt checksum events</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-indigo-200">
            <span className="font-semibold block mb-0.5">Phase 1 Status:</span>
            Distributed storage engine, real node cluster, and AI agents are not active in this phase. The button above demonstrates the control-plane UI integration point.
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
