import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badgeText,
  accentColor = "lime"
}) {
  return (
    <div className="border border-[#1F1F1F] bg-[#0C0C0C] p-5 rounded-xs hover:border-[#2A2A2A] transition-colors">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#181818]">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#858585]">
          {title}
        </span>
        {badgeText && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#B7FF2A] bg-[#B7FF2A]/10 border border-[#B7FF2A]/20 px-1.5 py-0.5 rounded-xs">
            {badgeText}
          </span>
        )}
      </div>

      <div className="font-mono text-2xl font-semibold text-[#F1F0EA] mb-2 tracking-tight">
        {value}
      </div>

      <div className="font-mono text-[11px] text-[#666666]">
        {subtext}
      </div>
    </div>
  );
}
