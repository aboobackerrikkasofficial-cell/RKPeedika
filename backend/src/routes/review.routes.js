import { Router } from 'express';
import { 
  createReview, 
  getReviewsForProduct, 
  checkReviewEligibility, 
  voteHelpful, 
  updateReviewStatus, 
  deleteReview 
} from '../controllers/review.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/product/:productId', getReviewsForProduct);
router.get('/product/:productId/eligibility', authenticate, checkReviewEligibility);
router.post('/:id/helpful', authenticate, voteHelpful);
router.put('/:id/moderation', authenticate, authorize('admin'), updateReviewStatus);
router.delete('/:id', authenticate, authorize('admin'), deleteReview);

export default router;
