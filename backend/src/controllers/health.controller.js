import { getHealthStatus } from '../services/health.service.js';

export function getHealth(req, res) {
  const health = getHealthStatus();
  return res.status(200).json(health);
}
