import { Router } from 'express';

import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} from '../controllers/product.controller.js';

import {
    authenticate,
    authorize
} from '../middleware/auth.js';

const router = Router();

/*
|--------------------------------------------------------------------------
| PUBLIC PRODUCT ROUTES
|--------------------------------------------------------------------------
*/

// Get all active products
router.get(
    '/',
    getAllProducts
);

// Get single product
router.get(
    '/:id',
    getProductById
);

/*
|--------------------------------------------------------------------------
| ADMIN / SELLER PRODUCT ROUTES
|--------------------------------------------------------------------------
*/

// Create product
router.post(
    '/',
    authenticate,
    authorize('admin', 'seller'),
    createProduct
);

// Update product
router.put(
    '/:id',
    authenticate,
    authorize('admin', 'seller'),
    updateProduct
);

// Delete product
router.delete(
    '/:id',
    authenticate,
    authorize('admin', 'seller'),
    deleteProduct
);

export default router;