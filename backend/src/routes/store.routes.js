import { Router } from 'express';
import { 
  getReturnPolicy, updateReturnPolicy, 
  getPrivacyPolicy, updatePrivacyPolicy, 
  getTermsConditions, updateTermsConditions, 
  getContactDetails, updateContactDetails 
} from '../controllers/store.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes (mounted at /api/store)
router.get('/policies/returns', getReturnPolicy);
router.get('/policies/privacy', getPrivacyPolicy);
router.get('/policies/terms', getTermsConditions);
router.get('/contact', getContactDetails);

// Admin routes (mounted at /api/admin/store)
router.put('/policies/returns', authenticate, authorize('admin'), updateReturnPolicy);
router.put('/policies/privacy', authenticate, authorize('admin'), updatePrivacyPolicy);
router.put('/policies/terms', authenticate, authorize('admin'), updateTermsConditions);
router.put('/contact', authenticate, authorize('admin'), updateContactDetails);

export default router;
