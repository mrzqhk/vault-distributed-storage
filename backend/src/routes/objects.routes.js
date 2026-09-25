import { Router } from 'express';
import {
  uploadObject,
  getObject,
  getObjectMetadata,
  deleteObject,
  listObjects
} from '../controllers/objects.controller.js';

const router = Router();

// List objects / Upload object
router.get('/', listObjects);
router.post('/', uploadObject);

// Retrieve latest by key
router.get('/by-key/:objectId', getObject);

// Metadata inspection
router.get('/:objectId/metadata', getObjectMetadata);

// Download object bytes
router.get('/:objectId', getObject);

// Delete object
router.delete('/:objectId', deleteObject);

export default router;
