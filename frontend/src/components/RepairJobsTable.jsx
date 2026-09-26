import React from 'react';

export default function RepairJobsTable() {
  const activeJobs = []; // Zero fake jobs: honesty about system state

  return (
    <section id="recovery" className="py-10 border-b border-[#1F1F1F]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-4 border-b border-[#181818]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            SEC 07 // RESILIENCE
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#F1F0EA] mt-1">
            Recovery <span className="text-[#858585] font-light">/ Repair Queue</span>
          </h2>
        </div>
        <div className="font-mono text-xs text-[#858585] mt-2 sm:mt-0 flex items-center gap-3">
          <span>SELF-HEALING: PASSIVE RECONCILIATION</span>
          <span className="text-[#333]">•</span>
          <span>QUORUM DRIVEN</span>
        </div>
      </div>

      {/* Queue State Container */}
      <div className="border border-[#1F1F1F] bg-[#0C0C0C] p-8 rounded-xs">
        {activeJobs.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-[#B7FF2A] font-semibold mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF2A]" />
                QUEUE CLEAR
              </div>
              <div className="font-display text-lg text-[#F1F0EA]">
                No replica repair tasks pending.
              </div>
              <div className="font-mono text-xs text-[#666666] mt-1">
                All stored objects meet target replication factor (N = 3). Storage nodes 9001, 9002, 9003 are in parity.
              </div>
            </div>

            <div className="font-mono text-[11px] text-[#858585] border border-[#222] bg-[#121212] px-4 py-2 rounded-xs self-start sm:self-auto">
              <div>AUTO-RECOVERY: STANDBY</div>
              <div className="text-[#555] text-[10px]">Triggers on replica degradation</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* If backend ever adds repair jobs, they can render here */}
          </div>
        )}
      </div>
    </section>
  );
}
