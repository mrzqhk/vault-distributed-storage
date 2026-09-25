import React from 'react';

const VARIANTS = {
  healthy: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80',
  active: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80',
  synced: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80',
  warning: 'bg-amber-950/70 text-amber-400 border-amber-800/80',
  degraded: 'bg-amber-950/70 text-amber-400 border-amber-800/80',
  repairing: 'bg-cyan-950/70 text-cyan-400 border-cyan-800/80',
  danger: 'bg-rose-950/70 text-rose-400 border-rose-800/80',
  offline: 'bg-rose-950/70 text-rose-400 border-rose-800/80',
  corrupt: 'bg-rose-950/70 text-rose-400 border-rose-800/80',
  neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/80',
  placeholder: 'bg-indigo-950/50 text-indigo-300 border-indigo-800/60'
};

const DOT_COLORS = {
  healthy: 'bg-emerald-400',
  active: 'bg-emerald-400',
  synced: 'bg-emerald-400',
  warning: 'bg-amber-400 animate-pulse',
  degraded: 'bg-amber-400 animate-pulse',
  repairing: 'bg-cyan-400 animate-spin',
  danger: 'bg-rose-400',
  offline: 'bg-rose-400',
  corrupt: 'bg-rose-400',
  neutral: 'bg-slate-400',
  placeholder: 'bg-indigo-400'
};

export default function StatusBadge({ status = 'neutral', label, showDot = true, className = '' }) {
  const normalizedKey = String(status).toLowerCase();
  const badgeStyle = VARIANTS[normalizedKey] || VARIANTS.neutral;
  const dotColor = DOT_COLORS[normalizedKey] || DOT_COLORS.neutral;
  const displayText = label || status.toUpperCase();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle} ${className}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      )}
      <span>{displayText}</span>
    </span>
  );
}
