import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badgeText = "DEMO PLACEHOLDER",
  accentColor = "cyan"
}) {
  const accentClasses = {
    cyan: "text-cyan-400 bg-cyan-950/40 border-cyan-800/40",
    emerald: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40",
    amber: "text-amber-400 bg-amber-950/40 border-amber-800/40",
    rose: "text-rose-400 bg-rose-950/40 border-rose-800/40",
    indigo: "text-indigo-400 bg-indigo-950/40 border-indigo-800/40",
  }[accentColor] || "text-cyan-400 bg-cyan-950/40 border-cyan-800/40";

  return (
    <div className="relative bg-[#0f172a]/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all group overflow-hidden">
      {/* Decorative gradient corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-medium">
              {title}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
            {value}
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg border ${accentClasses} transition-transform group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <span className="text-slate-400 truncate pr-2">{subtext}</span>
        {badgeText && (
          <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
