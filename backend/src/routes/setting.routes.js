import { Router } from 'express';
import { cachePublic } from '../middleware/cacheHeaders.js';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', cachePublic(300), getSettings);
router.put('/', authenticate, authorize('admin'), updateSettings);

export default router;
