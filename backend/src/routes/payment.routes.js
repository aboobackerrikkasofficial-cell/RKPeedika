import express from 'express';
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

router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);
router.get('/status/:paymentId', authenticate, getPaymentStatus);
router.post('/webhook/:gateway', handleWebhook);

// Dedicated Razorpay routes
router.post('/razorpay/create-order', authenticate, createRazorpayOrder);
router.post('/razorpay/verify', authenticate, verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

router.get('/gateways', authenticate, authorize('admin'), getGatewayConfigs);
router.put('/gateways/:id', authenticate, authorize('admin'), updateGatewayConfig);
router.post('/gateways', authenticate, authorize('admin'), createGatewayConfig);

export default router;
