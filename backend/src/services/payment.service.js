import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../config/db.js';

class PaymentGatewayAdapter {
  async createOrder(amount, currency, receipt, notes) { throw new Error('Not implemented'); }
  async verifySignature(payload, signature) { throw new Error('Not implemented'); }
  async getPaymentDetails(paymentId) { throw new Error('Not implemented'); }
}

class RazorpayAdapter extends PaymentGatewayAdapter {
  constructor(config) { 
    super(); 
    this.config = config; 
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || config.keyId,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  
  async createOrder(amount, currency, receipt, notes) {
    const amountInPaise = Math.round(amount * 100);
    return this.instance.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes
    });
  }
  
  async verifySignature(body, signature) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay secret key not configured on server.");
    }
    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');
      
    const bufGenerated = Buffer.from(generated, 'utf8');
    const bufSignature = Buffer.from(signature, 'utf8');
    if (bufGenerated.length !== bufSignature.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufGenerated, bufSignature);
  }
}

class CashfreeAdapter extends PaymentGatewayAdapter {
  constructor(config) { super(); this.config = config; }
  async createOrder(amount, currency, receipt, notes) {
    return { id: `cf_order_${Date.now()}`, amount, currency, receipt, status: 'created' };
  }
  async verifySignature(body, signature) { return true; }
}

class PhonePeAdapter extends PaymentGatewayAdapter {
  constructor(config) { super(); this.config = config; }
  async createOrder(amount, currency, receipt, notes) {
    return { id: `pp_order_${Date.now()}`, amount, currency, receipt, status: 'created' };
  }
  async verifySignature(body, signature) { return true; }
}

class StripeAdapter extends PaymentGatewayAdapter {
  constructor(config) { super(); this.config = config; }
  async createOrder(amount, currency, receipt, notes) {
    return { id: `pi_${Date.now()}`, amount: amount * 100, currency, receipt, status: 'requires_payment_method' };
  }
  async verifySignature(body, signature) { return true; }
}

export async function getActiveGateway() {
  const config = await prisma.paymentGatewayConfig.findFirst({ where: { isEnabled: true } });
  if (!config) return null;
  switch (config.gatewayName) {
    case 'razorpay': return { adapter: new RazorpayAdapter(config), config };
    case 'cashfree': return { adapter: new CashfreeAdapter(config), config };
    case 'phonepe': return { adapter: new PhonePeAdapter(config), config };
    case 'stripe': return { adapter: new StripeAdapter(config), config };
    default: return null;
  }
}

export { RazorpayAdapter, CashfreeAdapter, PhonePeAdapter, StripeAdapter };
