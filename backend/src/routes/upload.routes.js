import { Router } from 'express';

import {
    uploadProductImages,
    uploadImages,
} from '../controllers/upload.controller.js';

import {
    authenticate,
    authorize,
} from '../middleware/auth.js';

const router = Router();

/**
 * Upload product images.
 *
 * POST /api/uploads/product-images
 *
 * FormData:
 * images = multiple image files
 */
router.post(
    '/product-images',
    authenticate,
    authorize('admin', 'seller'),
    uploadProductImages,
    uploadImages
);

/**
 * Upload customer review images.
 *
 * POST /api/uploads/review-images
 *
 * FormData:
 * images = multiple image files
 */
router.post(
    '/review-images',
    authenticate,
    uploadProductImages,
    uploadImages
);

export default router;