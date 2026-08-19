import { Router } from 'express';
import { createOrder, getOrderById, updateOrderStatus, requestReturn, getReturns, getAllOrders, getUserOrderHistory, getOrderByOrderIdFormatted, updateOrderTracking, addTrackingEvent, publicTrackOrder, syncOrderTracking, cancelOrder } from '../controllers/order.controller.js';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize('admin'), getAllOrders);
router.get('/user/history', authenticate, getUserOrderHistory);
router.get('/track/:orderId', authenticate, getOrderByOrderIdFormatted);
router.post('/public/track', publicTrackOrder);
router.put('/:id/cancel', optionalAuthenticate, cancelOrder);
router.put('/:id/tracking', authenticate, authorize('admin'), updateOrderTracking);
router.post('/:id/tracking/events', authenticate, authorize('admin'), addTrackingEvent);
router.post('/:id/tracking/sync', authenticate, authorize('admin'), syncOrderTracking);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place a new e-commerce order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, paymentMethod, pincode]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               paymentMethod:
 *                 type: string
 *                 example: UPI
 *               pincode:
 *                 type: string
 *                 example: "110001"
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post('/', authenticate, createOrder);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Retrieve single order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details object
 */
router.get('/:id', authenticate, getOrderById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: shipped
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', authenticate, authorize('admin'), updateOrderStatus);

/**
 * @swagger
 * /api/orders/returns:
 *   post:
 *     summary: Request order return refund
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, reason]
 *     responses:
 *       201:
 *         description: Return request created
 */
router.post('/returns', authenticate, requestReturn);

/**
 * @swagger
 * /api/orders/returns:
 *   get:
 *     summary: Get all return requests (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of return requests
 */
router.get('/returns/all', authenticate, authorize('admin'), getReturns);

export default router;
