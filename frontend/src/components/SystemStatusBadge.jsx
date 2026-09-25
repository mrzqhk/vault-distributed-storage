import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Server } from 'lucide-react';
import { checkBackendHealth, API_BASE_URL } from '../services/api';

export default function SystemStatusBadge() {
  const [health, setHealth] = useState({
    status: 'checking', // 'checking' | 'online' | 'offline'
    service: null,
    error: null,
    lastChecked: null,
    url: ''
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runHealthCheck = async () => {
    setIsRefreshing(true);
    const result = await checkBackendHealth();
    setIsRefreshing(false);

    if (result.success) {
      setHealth({
        status: 'online',
        service: result.data.service || 'vault-backend',
        error: null,
        lastChecked: new Date().toLocaleTimeString(),
        url: result.url
      });
    } else {
      setHealth({
        status: 'offline',
        service: null,
        error: result.error,
        lastChecked: new Date().toLocaleTimeString(),
        url: result.url
      });
    }
  };

  useEffect(() => {
    runHealthCheck();
    // Periodic poll every 10s
    const timer = setInterval(runHealthCheck, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {health.status === 'online' && (
        <div 
          className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm transition-all"
          title={`Health check OK via ${health.url} at ${health.lastChecked}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-emerald-200">Backend:</span>
          <span>Online ({health.service})</span>
          <button
            onClick={runHealthCheck}
            disabled={isRefreshing}
            className="ml-1 text-emerald-400 hover:text-emerald-200 focus:outline-none"
            title="Refresh backend health status"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {health.status === 'offline' && (
        <div 
          className="flex items-center gap-2 bg-rose-950/70 border border-rose-800/90 text-rose-300 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm animate-pulse cursor-pointer hover:bg-rose-900/60 transition-all"
          onClick={runHealthCheck}
          title={`Connection failed to ${health.url}: ${health.error}. Click to retry.`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span className="font-semibold text-rose-200">Backend:</span>
          <span>Offline ({health.error})</span>
          <button
            onClick={runHealthCheck}
            disabled={isRefreshing}
            className="ml-1 text-rose-300 hover:text-white"
            title="Retry connection"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {health.status === 'checking' && (
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/80 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono">
          <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
          <span>Connecting to API...</span>
        </div>
      )}
    </div>
  );
}
