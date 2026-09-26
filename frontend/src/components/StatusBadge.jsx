import React from 'react';

const VARIANTS = {
  healthy: 'bg-[#B7FF2A]/10 text-[#B7FF2A] border-[#B7FF2A]/30',
  active: 'bg-[#B7FF2A]/10 text-[#B7FF2A] border-[#B7FF2A]/30',
  synced: 'bg-[#B7FF2A]/10 text-[#B7FF2A] border-[#B7FF2A]/30',
  online: 'bg-[#B7FF2A]/10 text-[#B7FF2A] border-[#B7FF2A]/30',
  warning: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
  degraded: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
  offline: 'bg-[#181818] text-[#777777] border-[#2A2A2A]',
  danger: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
  neutral: 'bg-[#141414] text-[#888888] border-[#222222]',
};

export default function StatusBadge({ status = 'neutral', label, showDot = true, className = '' }) {
  const key = String(status).toLowerCase();
  const style = VARIANTS[key] || VARIANTS.neutral;
  const isLime = ['healthy', 'active', 'synced', 'online'].includes(key);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs font-mono text-[10px] uppercase tracking-wider border ${style} ${className}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${isLime ? 'bg-[#B7FF2A]' : key === 'degraded' ? 'bg-amber-400' : 'bg-[#555]'}`} />
      )}
      <span>{label || status.toUpperCase()}</span>
    </span>
  );
}
