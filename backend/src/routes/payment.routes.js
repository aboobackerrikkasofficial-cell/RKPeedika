import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  handleWebhook,
  getGatewayConfigs,
  updateGatewayConfig,
  createGatewayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook
} from '../controllers/payment.controller.js';

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 payment attempts per windowMs
  message: "Too many payment requests, please try again later."
});

router.post('/create-order', authenticate, paymentLimiter, createPaymentOrder);
router.post('/verify', authenticate, paymentLimiter, verifyPayment);
router.get('/status/:paymentId', authenticate, getPaymentStatus);
router.post('/webhook/:gateway', paymentLimiter, handleWebhook);

// Dedicated Razorpay routes
router.post('/razorpay/create-order', authenticate, paymentLimiter, createRazorpayOrder);
router.post('/razorpay/verify', authenticate, paymentLimiter, verifyRazorpayPayment);
router.post('/razorpay/webhook', paymentLimiter, handleRazorpayWebhook);

router.get('/gateways', authenticate, authorize('admin'), getGatewayConfigs);
router.put('/gateways/:id', authenticate, authorize('admin'), updateGatewayConfig);
router.post('/gateways', authenticate, authorize('admin'), createGatewayConfig);

export default router;
