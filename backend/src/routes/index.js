import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Mount health routes at /health (which will be /api/health when mounted)
router.use('/health', healthRoutes);

export default router;
