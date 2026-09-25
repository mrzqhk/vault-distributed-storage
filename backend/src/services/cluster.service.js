import { config } from '../config/env.js';
import { getDatabase } from '../config/db.js';
import { logger } from '../utils/logger.js';

class ClusterService {
  constructor() {
    this.nodes = [...config.storageNodes];
  }

  /**
   * Return configured storage nodes
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Set or override storage nodes (useful for tests or dynamic node membership)
   */
  setNodes(newNodes) {
    this.nodes = [...newNodes];
    this.syncStorageNodes();
  }

  /**
   * Seed / synchronize storage node records in the SQLite database to satisfy foreign keys
   */
  syncStorageNodes() {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO storage_nodes (node_id, hostname, ip_address, port, status, last_heartbeat_at)
        VALUES (?, ?, ?, ?, 'healthy', datetime('now'))
        ON CONFLICT(node_id) DO UPDATE SET
          hostname = excluded.hostname,
          ip_address = excluded.ip_address,
          port = excluded.port,
          last_heartbeat_at = datetime('now')
      `);

      for (const node of this.nodes) {
        try {
          const parsed = new URL(node.url);
          const hostname = parsed.hostname;
          const ip = hostname === 'localhost' ? '127.0.0.1' : hostname;
          const port = parseInt(parsed.port || '80', 10);
          stmt.run(node.id, hostname, ip, port);
        } catch {
          stmt.run(node.id, 'localhost', '127.0.0.1', 9000);
        }
      }
    } catch (err) {
      logger.warn('Failed to sync storage nodes into database:', err.message);
    }
  }

  /**
   * Check health of a single storage node
   */
  async checkNodeHealth(node, timeoutMs = 1500) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${node.url}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          id: node.id,
          url: node.url,
          healthy: true,
          status: 'healthy',
          details: data
        };
      }

      return {
        id: node.id,
        url: node.url,
        healthy: false,
        status: 'unreachable',
        error: `HTTP ${res.status}`
      };
    } catch (err) {
      return {
        id: node.id,
        url: node.url,
        healthy: false,
        status: 'unreachable',
        error: err.message
      };
    }
  }

  /**
   * Check health of all configured nodes in parallel
   */
  async checkAllNodesHealth(timeoutMs = 1500) {
    const checks = this.nodes.map(node => this.checkNodeHealth(node, timeoutMs));
    return Promise.all(checks);
  }

  /**
   * Select healthy storage nodes for placing replicas
   */
  async selectHealthyNodes(desiredCount = config.defaultReplicationFactor) {
    this.syncStorageNodes();
    const healthResults = await this.checkAllNodesHealth(1500);

    const healthyNodes = this.nodes.filter(node => {
      const result = healthResults.find(r => r.id === node.id);
      return result && result.healthy;
    });

    // Return up to desiredCount healthy nodes
    return {
      selectedNodes: healthyNodes.slice(0, desiredCount),
      healthyCount: healthyNodes.length,
      totalCount: this.nodes.length,
      allNodeStatuses: healthResults
    };
  }
}

export const clusterService = new ClusterService();
