import { Router } from 'express';
import healthRoutes from './health.routes.js';
import objectsRoutes from './objects.routes.js';
import nodesRoutes from './nodes.routes.js';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/objects', objectsRoutes);
router.use('/nodes', nodesRoutes);

export default router;
