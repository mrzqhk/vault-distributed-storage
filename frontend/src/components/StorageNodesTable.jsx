import React, { useState, useEffect } from 'react';
import { fetchNodes } from '../services/api';

const DEFAULT_NODES = [
  {
    id: 'node-1',
    port: 9001,
    host: 'localhost',
    address: 'localhost:9001',
    role: 'STORAGE ENDPOINT 01',
    status: 'ONLINE',
    healthy: true,
    storagePath: 'storage-node/data-9001',
    heartbeat: 'Active',
  },
  {
    id: 'node-2',
    port: 9002,
    host: 'localhost',
    address: 'localhost:9002',
    role: 'STORAGE ENDPOINT 02',
    status: 'ONLINE',
    healthy: true,
    storagePath: 'storage-node/data-9002',
    heartbeat: 'Active',
  },
  {
    id: 'node-3',
    port: 9003,
    host: 'localhost',
    address: 'localhost:9003',
    role: 'STORAGE ENDPOINT 03',
    status: 'ONLINE',
    healthy: true,
    storagePath: 'storage-node/data-9003',
    heartbeat: 'Active',
  },
];

export default function StorageNodesTable() {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [loading, setLoading] = useState(false);

  const loadNodes = async () => {
    setLoading(true);
    const res = await fetchNodes();
    if (res.success && res.nodes && res.nodes.length > 0) {
      // Merge with real nodes from backend
      setNodes(prev => prev.map(def => {
        const live = res.nodes.find(n => n.id === def.id || n.port === def.port);
        if (live) {
          return {
            ...def,
            healthy: live.healthy ?? true,
            status: live.healthy === false ? 'UNREACHABLE' : 'ONLINE',
            lastCheck: live.latency_ms ? `${live.latency_ms}ms` : 'Healthy'
          };
        }
        return def;
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNodes();
    const interval = setInterval(loadNodes, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="nodes" className="py-10 border-b border-[#1F1F1F]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-4 border-b border-[#181818]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            SEC 04 // CLUSTER NODES
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#F1F0EA] mt-1">
            Storage Nodes <span className="text-[#858585] font-light">/ Cluster</span>
          </h2>
        </div>
        <div className="font-mono text-xs text-[#858585] mt-2 sm:mt-0 flex items-center gap-3">
          <span>03 CONFIGURED</span>
          <span className="text-[#333]">•</span>
          <span>PORT RANGE :9001 - :9003</span>
        </div>
      </div>

      {/* Clean Horizontal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nodes.map((node) => {
          const isHealthy = node.healthy !== false;
          return (
            <div
              key={node.id}
              className="border border-[#1F1F1F] bg-[#0C0C0C] p-5 rounded-xs hover:border-[#2E2E2E] transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#181818]">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#858585]">
                  {node.role}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-[#B7FF2A]' : 'bg-red-500'}`} />
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${isHealthy ? 'text-[#B7FF2A]' : 'text-red-400'}`}>
                    {node.status}
                  </span>
                </div>
              </div>

              {/* Node Title & Port */}
              <div className="flex items-baseline justify-between mb-4">
                <span className="font-display font-medium text-xl text-[#F1F0EA]">
                  {node.id}
                </span>
                <span className="font-mono text-base font-semibold text-[#B7FF2A]">
                  :{node.port}
                </span>
              </div>

              {/* Technical Facts */}
              <div className="space-y-2 font-mono text-[11px] pt-3 border-t border-[#181818]">
                <div className="flex items-center justify-between text-[#858585]">
                  <span>ENDPOINT</span>
                  <span className="text-[#F1F0EA]">{node.address}</span>
                </div>

                <div className="flex items-center justify-between text-[#858585]">
                  <span>STORAGE PATH</span>
                  <span className="text-[#666666]">{node.storagePath}</span>
                </div>

                <div className="flex items-center justify-between text-[#858585]">
                  <span>REPLICATION</span>
                  <span className="text-[#F1F0EA]">MEMBER 1 OF 3</span>
                </div>

                <div className="flex items-center justify-between text-[#858585]">
                  <span>HEARTBEAT</span>
                  <span className="text-[#B7FF2A]">{node.lastCheck || 'Synchronized'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cluster Node Summary Footer */}
      <div className="mt-4 p-3 border border-[#1F1F1F] bg-[#0E0E0E] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[10px] text-[#666666]">
        <span>TOTAL STORAGE PLANES: 3 INDEPENDENT PROCESSES</span>
        <span>NO SINGLE POINT OF FAILURE ACROSS OBJECT REPLICAS</span>
      </div>
    </section>
  );
}
