import { Router } from 'express';
import { getAllCoupons, createCoupon, validateCoupon, updateCoupon, deleteCoupon } from '../controllers/coupon.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Retrieve all active/expired store coupons (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 */
router.get('/', authenticate, authorize('admin'), getAllCoupons);

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create store coupon (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, type, value]
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 example: percentage
 *               value:
 *                 type: number
 *     responses:
 *       201:
 *         description: Coupon created
 */
router.post('/', authenticate, authorize('admin'), createCoupon);

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate checkout coupon code details
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME10
 *               spendAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Coupon valid
 */
router.post('/validate', validateCoupon);
router.put('/:id', authenticate, authorize('admin'), updateCoupon);
router.delete('/:id', authenticate, authorize('admin'), deleteCoupon);

export default router;
