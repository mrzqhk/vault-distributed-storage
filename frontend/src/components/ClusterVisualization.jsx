import React, { useState } from 'react';

const STORAGE_NODES = [
  {
    id: 'node-1',
    displayNumber: 'NODE 01',
    port: ':9001',
    address: 'localhost:9001',
    role: 'PRIMARY REPLICA SET',
    status: 'ONLINE',
    subpath: 'data-9001',
  },
  {
    id: 'node-2',
    displayNumber: 'NODE 02',
    port: ':9002',
    address: 'localhost:9002',
    role: 'PRIMARY REPLICA SET',
    status: 'ONLINE',
    subpath: 'data-9002',
  },
  {
    id: 'node-3',
    displayNumber: 'NODE 03',
    port: ':9003',
    address: 'localhost:9003',
    role: 'PRIMARY REPLICA SET',
    status: 'ONLINE',
    subpath: 'data-9003',
  },
];

export default function ClusterVisualization({ isOnline = true, activeNodes = [] }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredCoordinator, setHoveredCoordinator] = useState(false);

  return (
    <section id="topology" className="py-10 border-b border-[#1F1F1F]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8 pb-4 border-b border-[#181818]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            SEC 02 // TOPOLOGY
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#F1F0EA] mt-1">
            Storage Plane Topology
          </h2>
        </div>
        <div className="font-mono text-xs text-[#858585] mt-2 sm:mt-0 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF2A]" />
            N = 3 REPLICATION
          </span>
          <span className="text-[#333]">•</span>
          <span>FAN-OUT WRITE BUS</span>
        </div>
      </div>

      {/* Topology Canvas */}
      <div className="relative bg-[#0C0C0C] border border-[#1F1F1F] rounded-xs p-6 sm:p-10 overflow-hidden">
        
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#F1F0EA 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* 1. COORDINATOR NODE (Top Center) */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            onMouseEnter={() => setHoveredCoordinator(true)}
            onMouseLeave={() => setHoveredCoordinator(false)}
            className={`w-72 sm:w-80 border p-4 bg-[#121212] transition-all duration-200 cursor-default rounded-xs ${
              hoveredCoordinator 
                ? 'border-[#B7FF2A] shadow-[0_0_15px_rgba(183,255,42,0.15)] -translate-y-0.5' 
                : 'border-[#262626] hover:border-[#383838]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1D1D1D]">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#858585]">
                ROUTER &amp; METADATA
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#B7FF2A]' : 'bg-[#555]'}`} />
                <span className="font-mono text-[10px] uppercase text-[#F1F0EA]">
                  {isOnline ? 'ONLINE' : 'STANDBY'}
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display font-semibold text-lg sm:text-xl text-[#F1F0EA] tracking-tight">
                  COORDINATOR
                </div>
                <div className="font-mono text-xs text-[#858585] mt-0.5">
                  localhost:8000
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-[#666666]">
                <div>REST / API</div>
                <div className="text-[#B7FF2A]">W=3, R=1</div>
              </div>
            </div>

            {hoveredCoordinator && (
              <div className="mt-3 pt-2.5 border-t border-[#1D1D1D] font-mono text-[10px] text-[#858585] flex items-center justify-between animate-fade-in">
                <span>QUORUM: ALL 3 NODES</span>
                <span className="text-[#F1F0EA]">SHA-256 VERIFIED</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. SVG BUS & CONNECTION LINES */}
        <div className="relative h-20 sm:h-24 w-full max-w-4xl mx-auto pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 600 80" preserveAspectRatio="none" fill="none">
            {/* Base Bus Trunk & Horizontal Rail */}
            <path
              d="M 300 0 L 300 35 M 100 35 L 500 35"
              stroke="#242424"
              strokeWidth="1.5"
            />
            {/* Drop lines to each node */}
            <path d="M 100 35 L 100 80" stroke="#242424" strokeWidth="1.5" />
            <path d="M 300 35 L 300 80" stroke="#242424" strokeWidth="1.5" />
            <path d="M 500 35 L 500 80" stroke="#242424" strokeWidth="1.5" />

            {/* Subtle animated signal line along the bus */}
            <path
              d="M 300 0 L 300 35 M 100 35 L 500 35"
              stroke="#B7FF2A"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              className="animate-topology-signal"
            />

            {/* Highlighted connection path when a specific node is hovered */}
            {hoveredNode === 'node-1' && (
              <path
                d="M 300 0 L 300 35 L 100 35 L 100 80"
                stroke="#B7FF2A"
                strokeWidth="2"
                strokeOpacity="0.9"
                className="transition-all duration-150"
              />
            )}
            {hoveredNode === 'node-2' && (
              <path
                d="M 300 0 L 300 80"
                stroke="#B7FF2A"
                strokeWidth="2"
                strokeOpacity="0.9"
                className="transition-all duration-150"
              />
            )}
            {hoveredNode === 'node-3' && (
              <path
                d="M 300 0 L 300 35 L 500 35 L 500 80"
                stroke="#B7FF2A"
                strokeWidth="2"
                strokeOpacity="0.9"
                className="transition-all duration-150"
              />
            )}
          </svg>
        </div>

        {/* 3. STORAGE NODES ENDPOINTS (Bottom 3 Columns) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {STORAGE_NODES.map((node) => {
            const isHovered = hoveredNode === node.id;
            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`border p-4 bg-[#121212] transition-all duration-200 cursor-default rounded-xs ${
                  isHovered
                    ? 'border-[#B7FF2A] shadow-[0_0_15px_rgba(183,255,42,0.12)] -translate-y-1'
                    : 'border-[#262626] hover:border-[#383838]'
                }`}
              >
                {/* Node Status & Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1D1D1D]">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#858585]">
                    {node.role}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF2A]" />
                    <span className="font-mono text-[10px] uppercase text-[#F1F0EA]">
                      {node.status}
                    </span>
                  </div>
                </div>

                {/* Node Identity */}
                <div className="space-y-1">
                  <div className="font-display font-medium text-lg sm:text-xl text-[#F1F0EA] tracking-tight">
                    {node.displayNumber}
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#B7FF2A] font-medium">{node.port}</span>
                    <span className="text-[#666666]">{node.address}</span>
                  </div>
                </div>

                {/* Node Metadata Footer */}
                <div className="mt-3 pt-2.5 border-t border-[#1D1D1D] flex items-center justify-between font-mono text-[10px] text-[#666666]">
                  <span>REPLICA DISK</span>
                  <span className="text-[#858585]">{node.subpath}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Topology Explanatory Footer */}
        <div className="mt-8 pt-4 border-t border-[#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px] text-[#666666]">
          <div className="flex items-center gap-2">
            <span className="text-[#B7FF2A]">→</span>
            <span>Write flow: Client → Coordinator :8000 → Parallel fan-out to :9001, :9002, :9003</span>
          </div>
          <div className="text-[#858585]">
            Read failover: Automatic across healthy replicas (R=1)
          </div>
        </div>

      </div>
    </section>
  );
}
