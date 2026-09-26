import React from 'react';

export default function SystemMetricsStrip({ activeNodesCount = 3, isOnline = true }) {
  const metrics = [
    {
      label: 'REPLICATION FACTOR',
      value: 'N = 3',
      subtext: '3 replicas committed per write',
      accent: false,
    },
    {
      label: 'STORAGE NODES',
      value: `${String(activeNodesCount).padStart(2, '0')} ACTIVE`,
      subtext: 'node-1, node-2, node-3',
      accent: isOnline,
    },
    {
      label: 'COORDINATOR PORT',
      value: ':8000',
      subtext: 'Central routing & metadata plane',
      accent: false,
    },
    {
      label: 'CONTENT INTEGRITY',
      value: 'SHA-256',
      subtext: 'Authoritative hash verification',
      accent: false,
    },
    {
      label: 'WRITE CONSISTENCY',
      value: 'W = 3',
      subtext: 'Quorum acknowledged before commit',
      accent: false,
    },
  ];

  return (
    <section id="overview" className="border-b border-[#1F1F1F] py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#1F1F1F]">
        {metrics.map((m, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col justify-between py-4 sm:py-0 px-4 first:pl-0 last:pr-0`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#858585]">
                {m.label}
              </span>
            </div>

            <div className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-[#F1F0EA] mb-2 flex items-baseline gap-2">
              <span>{m.value}</span>
              {m.accent && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF2A] inline-block mb-1" />
              )}
            </div>

            <div className="font-mono text-[11px] text-[#666666] leading-tight">
              {m.subtext}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
