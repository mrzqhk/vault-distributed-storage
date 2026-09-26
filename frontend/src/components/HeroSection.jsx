import React from 'react';

export default function HeroSection({ isBackendOnline = false }) {
  return (
    <section className="pt-8 pb-10 border-b border-[#1F1F1F]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        
        {/* Left Editorial Statement */}
        <div className="max-w-3xl">
          {/* Index & Section Label */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#B7FF2A] bg-[#B7FF2A]/10 border border-[#B7FF2A]/30 px-2 py-0.5 rounded-xs">
              SEC 01 // CONTROL SURFACE
            </span>
            <span className="font-mono text-[11px] tracking-wider uppercase text-[#858585]">
              VAULT DISTRIBUTED STORAGE
            </span>
          </div>

          {/* Large Hero Display Statement */}
          <h1 className="font-display font-medium text-4xl sm:text-5xl lg:text-6xl text-[#F1F0EA] tracking-tight leading-[1.08] mb-5">
            Three nodes.<br />
            <span className="text-[#858585]">One storage plane.</span>
          </h1>

          {/* Supporting Infrastructure Copy */}
          <p className="text-sm sm:text-base text-[#858585] max-w-2xl leading-relaxed font-sans">
            Fault-tolerant object storage with replicated data, integrity verification and coordinator-driven retrieval. Storage nodes are independent; retrieval is not.
          </p>
        </div>

        {/* Right Architectural Metadata Block */}
        <div className="lg:w-80 flex-shrink-0 flex flex-col justify-end border-t lg:border-t-0 lg:border-l border-[#1F1F1F] pt-4 lg:pt-0 lg:pl-8">
          <div className="space-y-2.5 font-mono text-[11px]">
            <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
              <span className="text-[#666666] uppercase">SYSTEM STATE</span>
              <span className="inline-flex items-center gap-1.5 text-[#F1F0EA]">
                <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-[#B7FF2A] shadow-[0_0_6px_#B7FF2A]' : 'bg-[#555]'}`} />
                {isBackendOnline ? 'OPERATIONAL' : 'LOCAL STANDBY'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
              <span className="text-[#666666] uppercase">CONSISTENCY</span>
              <span className="text-[#F1F0EA]">QUORUM W=3, R=1</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
              <span className="text-[#666666] uppercase">HASH WITNESS</span>
              <span className="text-[#B7FF2A]">SHA-256</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#666666] uppercase">COORDINATOR</span>
              <span className="text-[#858585]">localhost:8000</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
