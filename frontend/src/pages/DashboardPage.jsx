import React, { useState, useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import SystemMetricsStrip from '../components/SystemMetricsStrip';
import ClusterVisualization from '../components/ClusterVisualization';
import ObjectsTable from '../components/ObjectsTable';
import StorageNodesTable from '../components/StorageNodesTable';
import IntegrityChecksumView from '../components/IntegrityChecksumView';
import RepairJobsTable from '../components/RepairJobsTable';
import ActivityLog from '../components/ActivityLog';
import { checkBackendHealth } from '../services/api';

export default function DashboardPage() {
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  useEffect(() => {
    const verifyHealth = async () => {
      const res = await checkBackendHealth();
      setIsBackendOnline(res.success);
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. Hero & Architectural Statement */}
      <HeroSection isBackendOnline={isBackendOnline} />

      {/* 2. System Overview: Editorial Metrics Strip */}
      <SystemMetricsStrip isOnline={isBackendOnline} activeNodesCount={3} />

      {/* 3. Signature Element: Cluster Topology Visualization */}
      <ClusterVisualization isOnline={isBackendOnline} />

      {/* 4. Objects Section: Live Object Store */}
      <ObjectsTable />

      {/* 5. Storage Nodes Section: 3 Actual Storage Nodes */}
      <StorageNodesTable />

      {/* 6. Checksum & Cryptographic Integrity Module */}
      <IntegrityChecksumView />

      {/* 7. Asymmetric Row: Recovery & Live Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RepairJobsTable />
        <ActivityLog />
      </div>
    </div>
  );
}
