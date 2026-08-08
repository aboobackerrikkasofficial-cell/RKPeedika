import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', getSettings);
router.put('/', authenticate, authorize('admin'), updateSettings);

export default router;
