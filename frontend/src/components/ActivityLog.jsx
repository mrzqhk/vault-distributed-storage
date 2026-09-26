import React, { useState, useEffect } from 'react';
import { subscribeToEvents } from '../services/api';

export default function ActivityLog() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((newEvent) => {
      setEvents((prev) => [newEvent, ...prev].slice(0, 50));
    });
    return unsubscribe;
  }, []);

  return (
    <section id="events" className="py-10 border-b border-[#1F1F1F]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-4 border-b border-[#181818]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            SEC 06 // AUDIT TRAIL
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#F1F0EA] mt-1">
            Event Stream <span className="text-[#858585] font-light">/ Live</span>
          </h2>
        </div>
        <div className="font-mono text-xs text-[#858585] mt-2 sm:mt-0 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF2A] animate-pulse" />
            LIVE STREAM
          </span>
          <span className="text-[#333]">•</span>
          <span>COORDINATOR DISPATCH</span>
        </div>
      </div>

      {/* Stream Canvas */}
      <div className="border border-[#1F1F1F] bg-[#0C0C0C] rounded-xs overflow-hidden">
        {events.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="font-mono text-sm tracking-widest text-[#858585] uppercase mb-1">
              WAITING FOR EVENTS
            </div>
            <div className="font-mono text-xs text-[#555] max-w-sm mx-auto">
              Real cluster events will stream here as objects are written, verified, or read through Coordinator :8000.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#181818] font-mono text-xs">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="py-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#121212] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-[#666666] text-[11px] w-16 flex-shrink-0">
                    {ev.timestamp}
                  </span>
                  <span className="text-[#B7FF2A] text-[11px] font-semibold tracking-wider uppercase px-1.5 py-0.5 bg-[#B7FF2A]/10 border border-[#B7FF2A]/20 rounded-xs">
                    {ev.type}
                  </span>
                  <span className="text-[#F1F0EA] truncate max-w-xs sm:max-w-md">
                    {ev.target}
                  </span>
                </div>
                <div className="text-[11px] text-[#858585] sm:text-right">
                  {ev.detail}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stream Footer */}
        <div className="p-3 border-t border-[#1F1F1F] bg-[#0E0E0E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[10px] text-[#666666]">
          <span>STREAM SOURCE: COORDINATOR DISPATCHER</span>
          <span>PERSISTENCE: TRANSACTION LOG &amp; METADATA WAL</span>
        </div>
      </div>
    </section>
  );
}
