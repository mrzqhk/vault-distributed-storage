import { Router } from 'express';
import { getNodes, getNodeHealth } from '../controllers/nodes.controller.js';

const router = Router();

router.get('/', getNodes);
router.get('/:nodeId', getNodeHealth);

export default router;
