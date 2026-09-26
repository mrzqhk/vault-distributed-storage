import React from 'react';

export default function VaultOpsAIModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#0F0F0F] border border-[#262626] rounded-xs shadow-2xl p-6 text-[#F1F0EA] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F]">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A] mb-1">
              SPECIFICATION // OPS AI
            </div>
            <h3 className="text-base font-display font-medium tracking-tight text-[#F1F0EA]">
              VaultOps Autonomous Coprocessor
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-[#F1F0EA] transition-colors font-mono text-sm"
          >
            [CLOSE]
          </button>
        </div>

        <div className="my-5 space-y-4 font-mono text-xs text-[#858585] leading-relaxed">
          <div className="p-3 bg-[#141414] border border-[#222222] rounded-xs">
            <span className="text-[#B7FF2A] text-[11px] block mb-2 uppercase tracking-wider">
              Autonomous Storage Objectives:
            </span>
            <ul className="space-y-1.5 text-[#F1F0EA] text-[11px]">
              <li>• Automated Replica Reseed on single-node partition detection</li>
              <li>• SHA-256 Bit-Rot Scavenging and background scrubbing</li>
              <li>• Asymmetric Disk Rebalancing across nodes :9001, :9002, :9003</li>
              <li>• Quorum Anomaly Analysis for write latencies</li>
            </ul>
          </div>

          <div className="p-3 bg-[#121212] border border-[#1F1F1F] text-[11px] text-[#858585] rounded-xs">
            <span className="text-[#F1F0EA] block mb-1">Architecture Alignment:</span>
            Control-plane interface integration point. Core fault-tolerant primitives run independently on coordinator and storage node processes.
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#1F1F1F]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#181818] hover:bg-[#222] border border-[#2A2A2A] text-xs font-mono uppercase text-[#F1F0EA] transition-colors rounded-xs"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
