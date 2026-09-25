import { clusterService } from '../services/cluster.service.js';

export async function getNodes(req, res, next) {
  try {
    const statuses = await clusterService.checkAllNodesHealth();
    return res.status(200).json({
      nodes: statuses,
      total: statuses.length,
      healthy_count: statuses.filter(s => s.healthy).length
    });
  } catch (err) {
    next(err);
  }
}

export async function getNodeHealth(req, res, next) {
  try {
    const { nodeId } = req.params;
    const node = clusterService.getNodes().find(n => n.id === nodeId);

    if (!node) {
      return res.status(404).json({
        error: {
          code: 'NODE_NOT_FOUND',
          message: `Storage node '${nodeId}' not recognized`
        }
      });
    }

    const health = await clusterService.checkNodeHealth(node);
    return res.status(200).json(health);
  } catch (err) {
    next(err);
  }
}
