import crypto from 'crypto';
import prisma from '../config/db.js';
import { getActiveGateway } from '../services/payment.service.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/appError.js';

export const createPaymentOrder = async (req, res, next) => {
  const { amount, orderId, method, upiId } = req.body;
  const userId = req.user.id;

  if (!amount) {
    return next(new BadRequestError("Amount is required"));
  }

  try {
    const gatewayContext = await getActiveGateway();
    if (!gatewayContext) {
      return next(new BadRequestError("No active payment gateway found"));
    }

    const { adapter, config } = gatewayContext;

    // Create order on gateway
    const receipt = orderId || `rcpt_${Date.now()}`;
    const gatewayOrder = await adapter.createOrder(amount, 'INR', receipt, {});

    // Create Payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId,
        gatewayName: config.gatewayName,
        gatewayOrderId: gatewayOrder.id,
        amount,
        currency: 'INR',
        method,
        upiId,
        status: 'created'
      }
    });

    res.status(201).json({
      success: true,
      paymentId: payment.id,
      gatewayOrderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      gatewayName: config.gatewayName,
      keyId: config.keyId // needed by frontend to initiate payment
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  const { paymentId, gatewayPaymentId, gatewaySignature, gatewayOrderId } = req.body;

  if (!paymentId || !gatewayPaymentId || !gatewaySignature) {
    return next(new BadRequestError("Payment verification details missing"));
  }

  try {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return next(new NotFoundError("Payment record not found"));
    }

    const gatewayContext = await getActiveGateway();
    if (!gatewayContext) {
      return next(new BadRequestError("No active payment gateway found"));
    }

    const { adapter } = gatewayContext;

    // Verify signature
    const body = gatewayOrderId + "|" + gatewayPaymentId;
    const isValid = await adapter.verifySignature(body, gatewaySignature);

    if (!isValid) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'failed' }
      });
      return next(new BadRequestError("Invalid payment signature"));
    }

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'paid',
        gatewayPaymentId,
        gatewaySignature
      }
    });

    // Update Order if associated
    let order = null;
    if (payment.orderId) {
      order = await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed'
        }
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment: updatedPayment,
      order
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatus = async (req, res, next) => {
  const { paymentId } = req.params;
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });
    if (!payment) {
      return next(new NotFoundError("Payment not found"));
    }

    if (payment.userId !== req.user.id && req.user.role !== 'admin') {
      return next(new ForbiddenError("Forbidden"));
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  const { gateway } = req.params;
  const payload = req.body;
  console.log(`Received webhook from ${gateway}:`, payload);
  // Log webhook and respond 200 OK
  res.status(200).send('OK');
};

export const getGatewayConfigs = async (req, res, next) => {
  try {
    const configs = await prisma.paymentGatewayConfig.findMany();
    // Mask keySecret for security
    const sanitizedConfigs = configs.map(config => ({
      ...config,
      keySecret: config.keySecret ? '********' : null
    }));
    res.json(sanitizedConfigs);
  } catch (error) {
    next(error);
  }
};

export const updateGatewayConfig = async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // If keySecret is masked, remove it from update
    if (data.keySecret === '********') {
      delete data.keySecret;
    }

    const config = await prisma.paymentGatewayConfig.update({
      where: { id },
      data
    });
    res.json({
      success: true,
      message: "Gateway config updated",
      config: {
        ...config,
        keySecret: config.keySecret ? '********' : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createGatewayConfig = async (req, res, next) => {
  const data = req.body;
  try {
    const config = await prisma.paymentGatewayConfig.create({
      data
    });
    res.status(201).json({
      success: true,
      message: "Gateway config created",
      config: {
        ...config,
        keySecret: config.keySecret ? '********' : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createRazorpayOrder = async (req, res, next) => {
  const { items, pincode, addressId, couponCode, idempotencyKey, orderId } = req.body;
  const userId = req.user.id;

  try {
    let order;
    let finalAmount = 0;

    // 1. Check if we are retrying an existing order
    if (orderId) {
      order = await prisma.order.findFirst({
        where: { id: orderId, userId }
      });
      if (!order) {
        return next(new NotFoundError("Existing order not found"));
      }
      if (order.paymentStatus === 'paid') {
        return next(new BadRequestError("Order is already paid"));
      }
      finalAmount = order.amount;
      
      // Increment payment attempt count
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentAttemptCount: { increment: 1 } }
      });
    } else {
      // 2. Validate request parameters for a new order
      if (!items || items.length === 0 || !pincode) {
        return next(new BadRequestError("Order items and delivery pincode are required."));
      }

      // 3. Retrieve address details
      let shippingDetails = {};
      if (addressId) {
        const address = await prisma.address.findUnique({ where: { id: addressId } });
        if (address) {
          shippingDetails = {
            shippingName: address.fullName || req.user.name || '',
            shippingPhone: address.phone,
            shippingStreet: `${address.houseFlatNumber}, ${address.streetRoadName}, ${address.areaLocality}${address.landmark ? ', ' + address.landmark : ''}`,
            shippingCity: address.city,
            shippingState: address.state,
            shippingPincode: address.pincode
          };
        }
      }

      // 4. Calculate final amount server-side
      let subtotal = 0;
      const orderItemsData = [];
      let maxDeliveryDays = 4;

      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          return next(new NotFoundError(`Product ${item.productId} does not exist.`));
        }
        if (product.stock < item.quantity) {
          return next(new BadRequestError(`Product ${product.name} is out of stock. Available: ${product.stock}`));
        }

        // Fetch online price for online payment
        const itemPrice = product.onlinePrice || product.price;
        subtotal += itemPrice * item.quantity;

        let productImage = null;
        try {
          const images = JSON.parse(product.images);
          if (Array.isArray(images) && images.length > 0) {
            productImage = images[0];
          }
        } catch (e) {}

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: itemPrice,
          productName: product.name,
          productImage: productImage
        });

        if (product.estimatedDeliveryDays && product.estimatedDeliveryDays > maxDeliveryDays) {
          maxDeliveryDays = product.estimatedDeliveryDays;
        }
      }

      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + maxDeliveryDays);

      // Coupon discount
      let discount = 0;
      if (couponCode) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        if (coupon && coupon.status === 'active' && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
          if (subtotal >= coupon.minSpend) {
            if (coupon.type === 'percentage') {
              discount = (subtotal * coupon.value) / 100;
              if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
              }
            } else {
              discount = coupon.value;
            }
          }
        }
      }

      // Online payment discount (12%)
      const storeSettings = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
      const onlineDiscountPct = storeSettings?.onlineDiscount ?? 12;
      const paymentDiscount = (subtotal - discount) * (onlineDiscountPct / 100);

      const totalDiscount = discount + paymentDiscount;
      finalAmount = Math.max(0, subtotal - totalDiscount);

      const userFacingOrderId = `ODR-${Math.floor(100000 + Math.random() * 900000)}`;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const invoiceNumber = `INV-${dateStr}-${Math.floor(100000 + Math.random() * 900000)}`;

      // 5. Create local order and deduct stock in a transaction
      order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderId: userFacingOrderId,
            invoiceNumber,
            userId,
            amount: finalAmount,
            status: 'pending',
            paymentMethod: 'razorpay',
            paymentStatus: 'pending',
            transactionType: 'ONLINE',
            pincode,
            addressId,
            discountAmount: totalDiscount,
            couponCode,
            estimatedDelivery,
            idempotencyKey,
            paymentAttemptCount: 1,
            ...shippingDetails,
            orderItems: {
              create: orderItemsData
            }
          }
        });

        // Deduct stock
        for (const item of orderItemsData) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              quantityChange: -item.quantity,
              type: "sale",
              reason: `Order deduction: ${userFacingOrderId}`
            }
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { userId }
        });

        return newOrder;
      });
    }

    // 6. Call Razorpay SDK to create the order
    const gatewayContext = await getActiveGateway();
    if (!gatewayContext || gatewayContext.config.gatewayName !== 'razorpay') {
      return next(new BadRequestError("Razorpay gateway is not active or enabled"));
    }

    const { adapter, config } = gatewayContext;
    const rzpReceipt = order.orderId;
    const rzpOrder = await adapter.createOrder(finalAmount, 'INR', rzpReceipt, {});

    // Update the local order and create a payment record
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id }
    });

    // Create a payment record link
    await prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        gatewayName: 'razorpay',
        gatewayOrderId: rzpOrder.id,
        amount: finalAmount,
        currency: 'INR',
        status: 'created'
      }
    });

    res.status(201).json({
      success: true,
      razorpay_order_id: rzpOrder.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || config.keyId,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      internal_order_id: order.id
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req, res, next) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, internal_order_id } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !internal_order_id) {
    return next(new BadRequestError("Required signature verification parameters are missing"));
  }

  try {
    const order = await prisma.order.findFirst({
      where: { id: internal_order_id, userId: req.user.id }
    });
    if (!order) {
      return next(new NotFoundError("Order record not found"));
    }

    // Verify razorpayOrderId matches what's on the order
    if (order.razorpayOrderId !== razorpay_order_id) {
      return next(new BadRequestError("Razorpay order ID mismatch"));
    }

    const gatewayContext = await getActiveGateway();
    if (!gatewayContext || gatewayContext.config.gatewayName !== 'razorpay') {
      return next(new BadRequestError("Razorpay gateway is not active"));
    }

    const { adapter } = gatewayContext;

    // Verify signature using timing-safe comparison
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const isValid = await adapter.verifySignature(body, razorpay_signature);

    if (!isValid) {
      await prisma.order.update({
        where: { id: internal_order_id },
        data: { paymentFailureReason: "Signature verification failed" }
      });
      await prisma.payment.updateMany({
        where: { gatewayOrderId: razorpay_order_id },
        data: { status: 'failed' }
      });
      return next(new BadRequestError("Invalid payment signature"));
    }

    // Prevent duplicate payment processing
    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: "Payment already verified",
        order
      });
    }

    // Update payment and order in a transaction
    const { updatedOrder } = await prisma.$transaction(async (tx) => {
      // Update Payment record
      await tx.payment.updateMany({
        where: { gatewayOrderId: razorpay_order_id },
        data: {
          status: 'paid',
          gatewayPaymentId: razorpay_payment_id,
          gatewaySignature: razorpay_signature
        }
      });

      // Update Order record
      const uOrder = await tx.order.update({
        where: { id: internal_order_id },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date()
        }
      });

      // Log notification
      await tx.notification.create({
        data: {
          userId: req.user.id,
          title: "Payment Confirmed",
          detail: `Your payment of ₹${uOrder.amount.toFixed(2)} for order ${uOrder.orderId} was verified.`,
          type: "order"
        }
      });

      return { updatedOrder: uOrder };
    });

    res.json({
      success: true,
      message: "Payment successful. Your order has been confirmed.",
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

export const handleRazorpayWebhook = async (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.warn("Webhook signature or webhook secret is missing.");
    return res.status(400).send("Signature validation failed");
  }

  // Validate signature
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(req.rawBody || '');
  const digest = shasum.digest('hex');

  // Timing safe comparison
  const bufGenerated = Buffer.from(digest, 'utf8');
  const bufSignature = Buffer.from(signature, 'utf8');
  const isSignatureValid = bufGenerated.length === bufSignature.length && crypto.timingSafeEqual(bufGenerated, bufSignature);

  if (!isSignatureValid) {
    console.warn("Invalid webhook signature.");
    return res.status(400).send("Signature mismatch");
  }

  const payload = req.body;
  const event = payload.event;
  console.log(`Verified webhook event received: ${event}`);

  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      const rzpPaymentId = paymentEntity.id;
      const method = paymentEntity.method;
      const upiId = paymentEntity.vpa || null;

      // Find order by razorpayOrderId
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId: rzpOrderId }
      });

      if (order) {
        if (order.paymentStatus !== 'paid') {
          await prisma.$transaction(async (tx) => {
            // Update order status
            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'paid',
                status: 'confirmed',
                razorpayPaymentId: rzpPaymentId,
                paidAt: new Date()
              }
            });

            // Update payment record
            await tx.payment.updateMany({
              where: { gatewayOrderId: rzpOrderId },
              data: {
                status: 'paid',
                gatewayPaymentId: rzpPaymentId,
                method,
                upiId
              }
            });

            // Create notification
            await tx.notification.create({
              data: {
                userId: order.userId,
                title: "Payment Confirmed via Webhook",
                detail: `Payment of ₹${order.amount.toFixed(2)} verified via system webhook.`,
                type: "order"
              }
            });
          });
          console.log(`Order ${order.orderId} paid successfully via webhook event ${event}.`);
        } else {
          console.log(`Order ${order.orderId} was already marked as paid.`);
        }
      } else {
        console.warn(`No order found for Razorpay order ID ${rzpOrderId}`);
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      const failureReason = paymentEntity.error_description || "Payment failed";

      const order = await prisma.order.findFirst({
        where: { razorpayOrderId: rzpOrderId }
      });

      if (order) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { paymentFailureReason: failureReason }
          });
          await tx.payment.updateMany({
            where: { gatewayOrderId: rzpOrderId },
            data: { status: 'failed', gatewayResponse: JSON.stringify(paymentEntity) }
          });
        });
        console.log(`Order ${order.orderId} marked as failed via webhook.`);
      }
    } else if (event === 'payment.authorized') {
      const paymentEntity = payload.payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId: rzpOrderId }
      });

      if (order) {
        await prisma.payment.updateMany({
          where: { gatewayOrderId: rzpOrderId },
          data: { status: 'authorized' }
        });
        console.log(`Payment authorized for order ${order.orderId}`);
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Internal server error during webhook handling");
  }
};
