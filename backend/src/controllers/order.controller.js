import prisma from '../config/db.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/appError.js';
import { calculateProductPrice, getProductMRP } from '../utils/pricing.js';
import { syncTracking, parseTrackingLinkOrNumber } from '../services/tracking.service.js';

const augmentOrderTrackingEvents = (order) => {
  if (!order) return order;
  
  const hasManualEvents = order.trackingEvents && order.trackingEvents.length > 0;
  if (!order.trackingNumber || hasManualEvents) {
    return order;
  }

  const now = new Date();
  const createdDate = new Date(order.createdAt);
  const shippedDate = order.shippedAt ? new Date(order.shippedAt) : new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);
  const estimatedDelivery = order.estimatedDelivery ? new Date(order.estimatedDelivery) : new Date(shippedDate.getTime() + 4 * 24 * 60 * 60 * 1000);
  
  const simulatedEvents = [];
  
  // 1. Confirmed
  simulatedEvents.push({
    id: `sim-confirm-${order.id}`,
    orderId: order.id,
    status: 'confirmed',
    message: 'Order confirmed and registered.',
    eventDate: createdDate,
    createdAt: createdDate,
    createdBy: 'system'
  });

  // 2. Packed
  const packedDate = new Date(createdDate.getTime() + 12 * 60 * 60 * 1000);
  if (now >= packedDate || now >= shippedDate) {
    simulatedEvents.push({
      id: `sim-pack-${order.id}`,
      orderId: order.id,
      status: 'packed',
      message: 'Item has been packed and is ready to be dispatched.',
      eventDate: packedDate < shippedDate ? packedDate : new Date(shippedDate.getTime() - 2 * 60 * 60 * 1000),
      createdAt: packedDate < shippedDate ? packedDate : new Date(shippedDate.getTime() - 2 * 60 * 60 * 1000),
      createdBy: 'system'
    });
  }

  // 3. Shipped
  const isShippedState = ['shipped', 'out_for_delivery', 'delivered'].includes(order.status?.toLowerCase());
  if (isShippedState || now >= shippedDate) {
    simulatedEvents.push({
      id: `sim-ship-${order.id}`,
      orderId: order.id,
      status: 'shipped',
      message: `Order dispatched via ${order.courier || 'Meesho Delivery Partner'} (Tracking ID: ${order.trackingNumber})`,
      eventDate: shippedDate,
      createdAt: shippedDate,
      createdBy: 'system'
    });
  }

  // 4. On the Way (Transit)
  const transitDate = new Date(shippedDate.getTime() + 1.5 * 24 * 60 * 60 * 1000);
  if (isShippedState && (now >= transitDate || ['out_for_delivery', 'delivered'].includes(order.status?.toLowerCase()))) {
    simulatedEvents.push({
      id: `sim-transit-${order.id}`,
      orderId: order.id,
      status: 'on_the_way',
      message: `In transit: Package is moving towards the nearest ${order.courier || 'logistics'} delivery hub.`,
      eventDate: transitDate,
      createdAt: transitDate,
      createdBy: 'system'
    });
  }

  // 5. Out for Delivery
  const outForDeliveryDate = order.status?.toLowerCase() === 'delivered' ? new Date(estimatedDelivery.getTime() - 4 * 60 * 60 * 1000) : new Date(shippedDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const isOutForDeliveryState = ['out_for_delivery', 'delivered'].includes(order.status?.toLowerCase());
  if (isOutForDeliveryState || (isShippedState && now >= outForDeliveryDate)) {
    simulatedEvents.push({
      id: `sim-out-${order.id}`,
      orderId: order.id,
      status: 'out_for_delivery',
      message: `Out for delivery: Package is with the ${order.courier || 'courier'} delivery executive.`,
      eventDate: outForDeliveryDate,
      createdAt: outForDeliveryDate,
      createdBy: 'system'
    });
  }

  // 6. Delivered
  const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : estimatedDelivery;
  if (order.status?.toLowerCase() === 'delivered' || (isShippedState && now >= deliveredDate)) {
    simulatedEvents.push({
      id: `sim-deliver-${order.id}`,
      orderId: order.id,
      status: 'delivered',
      message: `Package delivered successfully via ${order.courier || 'our delivery partner'}. Thank you for shopping with RK Peedika!`,
      eventDate: deliveredDate,
      createdAt: deliveredDate,
      createdBy: 'system'
    });
  }

  // Sort descending by eventDate
  simulatedEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  
  // Update order status based on latest simulated event
  const latestEvent = simulatedEvents[0];
  let finalStatus = order.status;
  if (latestEvent) {
    finalStatus = latestEvent.status;
  }

  return {
    ...order,
    status: finalStatus,
    trackingEvents: simulatedEvents
  };
};

export const createOrder = async (req, res, next) => {
  let { items, paymentMethod, pincode, addressId, couponCode, idempotencyKey } = req.body;
  const userId = req.user.id;

  if (paymentMethod) {
    paymentMethod = paymentMethod.toUpperCase();
  }

  if (!items || items.length === 0 || !pincode) {
    return next(new BadRequestError("Order items and delivery pincode are required."));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existingOrder = await tx.order.findUnique({ 
          where: { idempotencyKey },
          include: { 
            orderItems: { include: { product: true } }
          }
        });
        if (existingOrder) {
          return { alreadyPlaced: true, order: existingOrder };
        }
      }

    let shippingDetails = {};
    if (addressId) {
      const address = await tx.address.findUnique({ where: { id: addressId } });
      if (address) {
        shippingDetails = {
          shippingName: address.fullName || req.user.name || '',
          shippingPhone: address.phone,
          customerEmail: address.email,
          shippingStreet: `${address.houseFlatNumber}, ${address.streetRoadName}, ${address.areaLocality}${address.landmark ? ', ' + address.landmark : ''}`,
          shippingCity: address.city,
          shippingState: address.state,
          shippingPincode: address.pincode
        };
      }
    }

    let subtotal = 0;
    const orderItemsData = [];
    let maxDeliveryDays = 4;
    
    const productIds = items.map(i => i.productId);
    const productsList = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(productsList.map(p => [p.id, p]));

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        return next(new NotFoundError(`Product ${item.productId} does not exist.`));
      }

      if (product.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      const itemPrice = calculateProductPrice(product, paymentMethod);
      const itemMrp = getProductMRP(product);

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
        mrp: itemMrp,
        productName: product.name,
        productImage: productImage
      });

      if (product.estimatedDeliveryDays && product.estimatedDeliveryDays > maxDeliveryDays) {
        maxDeliveryDays = product.estimatedDeliveryDays;
      }
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + maxDeliveryDays);

    let discount = 0;
    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
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

    let paymentDiscount = 0; // Removed extra percentage discount
    if (paymentMethod !== 'COD') {
      // paymentDiscount = (subtotal - discount) * 0.12; 
    }

    const totalDiscount = discount + paymentDiscount;
    const finalAmount = Math.max(0, subtotal - totalDiscount);

    let orderPrefix = "ODR";
    if (orderItemsData.length > 0 && orderItemsData[0].productName) {
      const firstChar = orderItemsData[0].productName.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        orderPrefix = firstChar;
      } else {
        orderPrefix = "ODR";
      }
    }
    const userFacingOrderId = `${orderPrefix}${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = await tx.order.create({
        data: {
          orderId: userFacingOrderId,
          invoiceNumber,
          userId,
          amount: finalAmount,
          status: paymentMethod === 'COD' ? 'confirmed' : 'pending',
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'pending' : 'awaiting',
          transactionType: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
          pincode,
          addressId,
          discountAmount: totalDiscount,
          couponCode,
          estimatedDelivery,
          idempotencyKey,
          ...shippingDetails,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });

      // Decrement stock logic
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      await tx.notification.create({
        data: {
          userId,
          title: `Order Placed Successfully`,
          detail: `Your order ${userFacingOrderId} of value ₹${finalAmount.toFixed(2)} is received.`,
          type: "order"
        }
      });

      // FCM Notification
      try {
        const { sendOrderNotification } = await import('../services/notification.service.js');
        await sendOrderNotification(
          userId,
          'Order Placed Successfully',
          `Your order ${userFacingOrderId} has been received.`
        );
      } catch (fcmErr) {
        console.error("FCM Error on Order Placed:", fcmErr);
      }

      await tx.cartItem.deleteMany({
        where: { 
          userId,
          productId: { in: productIds }
        }
      });

      return { alreadyPlaced: false, order: newOrder };
    });

    if (result.alreadyPlaced) {
      return res.status(200).json({
        success: true,
        message: "Order already placed",
        order: result.order
      });
    }
    
    // Trigger email for COD orders right away
    console.log(`[Order Debug] Checking email conditions for order ${result.order.orderId}:`);
    console.log(`[Order Debug] paymentMethod = ${result.order.paymentMethod}`);
    console.log(`[Order Debug] customerEmail = ${result.order.customerEmail}`);
    if (result.order.paymentMethod === 'COD' && result.order.customerEmail) {
      try {
        const { sendOrderConfirmationEmail } = await import('../services/email.service.js');
        await sendOrderConfirmationEmail(result.order, result.order.orderItems, result.order.customerEmail);
      } catch (err) {
        console.error("Failed to send COD order confirmation email:", err);
      }
    } else {
      console.log(`[Order Debug] Skipping email trigger because condition failed.`);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: result.order
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByOrderIdFormatted = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    
    let order = await prisma.order.findFirst({
      where: isUuid ? { id: orderId } : { orderId },
      include: { 
        orderItems: { include: { product: true } },
        trackingEvents: { orderBy: { eventDate: 'desc' } },
        payments: true
      }
    });

    if (!order) {
      return next(new NotFoundError(`Order ${orderId} not found`));
    }

    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return next(new ForbiddenError("Forbidden"));
    }

    // Auto sync tracking details if order is not delivered yet
    if (order.trackingNumber && order.status !== 'delivered') {
      try {
        const synced = await syncTracking(order.id, false);
        if (synced) {
          order = synced;
        }
      } catch (err) {
        console.error("Order sync error on fetch formatted:", err);
      }
    }

    res.json(augmentOrderTrackingEvents(order));
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let order = await prisma.order.findFirst({
      where: isUuid ? { id } : { orderId: id },
      include: { 
        orderItems: { include: { product: true } },
        user: { select: { name: true, email: true, phone: true } },
        trackingEvents: { orderBy: { eventDate: 'desc' } },
        payments: true
      }
    });

    if (!order) {
      return next(new NotFoundError(`Order ID ${id} not found`));
    }

    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return next(new ForbiddenError("Forbidden: You are not authorized to view this order."));
    }

    // Auto sync tracking details if order is not delivered yet
    if (order.trackingNumber && order.status !== 'delivered') {
      try {
        const synced = await syncTracking(order.id, false);
        if (synced) {
          order = synced;
        }
      } catch (err) {
        console.error("Order sync error on fetch by ID:", err);
      }
    }

    res.json(augmentOrderTrackingEvents(order));
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;

  try {
    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      return next(new NotFoundError(`Order ID ${id} not found`));
    }

    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packed', 'cancelled'],
      packed: ['shipped', 'cancelled'],
      shipped: ['out_for_delivery'],
      out_for_delivery: ['delivered'],
      delivered: ['exchange_requested', 'completed'],
      exchange_requested: ['completed'],
      completed: [],
      cancelled: []
    };

    const currentStatus = currentOrder.status.toLowerCase();
    const targetStatus = status.toLowerCase();

    if (currentStatus !== targetStatus) {
      if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(targetStatus)) {
        return next(new BadRequestError(`Invalid status transition from ${currentOrder.status} to ${status}`));
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: { 
        status,
        ...(trackingNumber && { trackingNumber })
      }
    });

    // FCM Notification
    try {
      const { sendOrderNotification } = await import('../services/notification.service.js');
      const orderIdFormatted = order.orderId;
      let title = '';
      let body = '';
      
      if (status === 'shipped') {
        title = 'Order Shipped';
        body = `Your order ${orderIdFormatted} has been shipped.`;
      } else if (status === 'out_for_delivery') {
        title = 'Out for Delivery';
        body = `Your order ${orderIdFormatted} is out for delivery today.`;
      } else if (status === 'delivered') {
        title = 'Order Delivered';
        body = `Your order ${orderIdFormatted} has been delivered successfully.`;
      }

      if (title && body) {
        await sendOrderNotification(order.userId, title, body);
      }
    } catch (fcmErr) {
      console.error("FCM Error on Status Update:", fcmErr);
    }
    
    // Status update email
    if (order.customerEmail) {
      try {
        const { sendOrderStatusEmail } = await import('../services/email.service.js');
        await sendOrderStatusEmail(order, order.customerEmail);
      } catch (err) {
        console.error("Failed to send order status email:", err);
      }
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderTracking = async (req, res, next) => {
  const { id } = req.params;
  const { courier, trackingNumber, trackingUrl, estimatedDelivery, estimatedDeliveryDate, shippedAt, shippedDate, deliveredAt, internalNotes, customerStatusMessage, customerMessage } = req.body;

  try {
    const finalEstimatedDelivery = estimatedDelivery || estimatedDeliveryDate;
    const finalShippedAt = shippedAt || shippedDate;
    const finalCustomerStatusMessage = customerStatusMessage || customerMessage;

    // Parse pasted link or tracking number
    let parsedCourier = courier;
    let parsedTrackingNumber = trackingNumber ? String(trackingNumber).trim() : '';
    let parsedTrackingUrl = trackingUrl ? String(trackingUrl).trim() : '';

    if (parsedTrackingUrl) {
      const parsed = parseTrackingLinkOrNumber(parsedTrackingUrl);
      if (parsed.trackingNumber) {
        parsedTrackingNumber = parsed.trackingNumber;
        if (parsed.courier && !parsedCourier) {
          parsedCourier = parsed.courier;
        }
      }
    } else if (parsedTrackingNumber) {
      const parsed = parseTrackingLinkOrNumber(parsedTrackingNumber);
      if (parsed.trackingNumber) {
        parsedTrackingNumber = parsed.trackingNumber;
        if (parsed.courier && !parsedCourier) {
          parsedCourier = parsed.courier;
        }
        // If the admin pasted a full tracking link in the trackingNumber field,
        // extract it and set it as the trackingUrl so the link isn't lost
        if (trackingNumber.trim().startsWith('http://') || trackingNumber.trim().startsWith('https://')) {
          parsedTrackingUrl = trackingNumber.trim();
        }
      }
    }

    // Auto-generate tracking URL if empty but we have trackingNumber and courier
    if (!parsedTrackingUrl && parsedTrackingNumber && parsedCourier) {
      const cleanCourier = parsedCourier.toLowerCase();
      if (cleanCourier.includes('shadowfax')) {
        parsedTrackingUrl = `https://track.shadowfax.in/track?orderId=${parsedTrackingNumber}`;
      } else if (cleanCourier.includes('delhivery')) {
        parsedTrackingUrl = `https://www.delhivery.com/track/package/${parsedTrackingNumber}`;
      } else if (cleanCourier.includes('ekart')) {
        parsedTrackingUrl = `https://ekartlogistics.com/track/${parsedTrackingNumber}`;
      } else if (cleanCourier.includes('valmo')) {
        parsedTrackingUrl = 'https://www.valmo.in/';
      } else if (cleanCourier.includes('xpressbees')) {
        parsedTrackingUrl = `https://www.xpressbees.com/shipment/tracking?awb=${parsedTrackingNumber}`;
      } else if (cleanCourier.includes('bluedart') || cleanCourier.includes('blue dart')) {
        parsedTrackingUrl = 'https://www.bluedart.com/';
      } else if (cleanCourier.includes('dhl')) {
        parsedTrackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${parsedTrackingNumber}`;
      } else if (cleanCourier.includes('fedex')) {
        parsedTrackingUrl = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${parsedTrackingNumber}`;
      } else if (cleanCourier.includes('ups')) {
        parsedTrackingUrl = `https://www.ups.com/track?tracknum=${parsedTrackingNumber}`;
      } else {
        parsedTrackingUrl = `https://www.google.com/search?q=${encodeURIComponent(parsedCourier + ' tracking ' + parsedTrackingNumber)}`;
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: { 
        courier: parsedCourier,
        trackingNumber: parsedTrackingNumber,
        trackingUrl: parsedTrackingUrl,
        estimatedDelivery: finalEstimatedDelivery ? new Date(finalEstimatedDelivery) : undefined,
        shippedAt: finalShippedAt ? new Date(finalShippedAt) : undefined,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
        internalNotes,
        customerStatusMessage: finalCustomerStatusMessage
      }
    });

    // Auto sync with TrackingMore in background immediately
    if (parsedTrackingNumber) {
      try {
        await syncTracking(order.id, true);
      } catch (syncErr) {
        console.error("Auto tracking sync error:", syncErr);
      }
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { trackingEvents: { orderBy: { eventDate: 'desc' } } }
    });

    res.json({ success: true, message: "Tracking details updated", order: augmentOrderTrackingEvents(updatedOrder) });
  } catch (error) {
    next(error);
  }
};

export const addTrackingEvent = async (req, res, next) => {
  const { id } = req.params;
  const { status, message, eventDate } = req.body;

  if (!status || !message) {
    return next(new BadRequestError("Status and message are required."));
  }

  try {
    const event = await prisma.orderTrackingEvent.create({
      data: {
        orderId: id,
        status,
        message,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        createdBy: "admin"
      }
    });

    await prisma.order.update({
      where: { id },
      data: { status, customerStatusMessage: message }
    });

    res.status(201).json({ success: true, message: "Tracking event added", event });
  } catch (error) {
    next(error);
  }
};

export const requestReturn = async (req, res, next) => {
  const { orderId, reason } = req.body;

  if (!orderId || !reason) {
    return next(new BadRequestError("OrderId and reason are required to file a return request."));
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return next(new NotFoundError("Order does not exist."));
    }

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        reason,
        status: "pending",
        refundAmount: order.amount
      }
    });

    res.status(201).json({
      success: true,
      message: "Return request registered for review",
      returnRequest
    });
  } catch (error) {
    next(error);
  }
};

export const getReturns = async (req, res, next) => {
  try {
    const returns = await prisma.returnRequest.findMany({
      include: { order: true }
    });
    res.json(returns);
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    // Always paginate — never dump entire orders table
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));
    const skip  = (page - 1) * limit;

    // Build optional status filter
    const statusFilter = req.query.status && req.query.status !== 'All'
      ? { status: req.query.status }
      : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: statusFilter,
        // Only return columns the admin list actually displays
        select: {
          id: true,
          orderId: true,
          invoiceNumber: true,
          amount: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          pincode: true,
          shippingName: true,
          shippingPhone: true,
          shippingStreet: true,
          shippingCity: true,
          shippingState: true,
          shippingPincode: true,
          trackingNumber: true,
          courier: true,
          trackingUrl: true,
          shippedAt: true,
          estimatedDelivery: true,
          internalNotes: true,
          customerStatusMessage: true,
          razorpayOrderId: true,
          razorpayPaymentId: true,
          paidAt: true,
          paymentFailureReason: true,
          createdAt: true,
          updatedAt: true,
          // Customer: name/phone/email only
          user: { select: { name: true, email: true, phone: true } },
          // Order items: name + quantity + price (snapshot) + thumbnail only
          orderItems: {
            select: {
              id: true,
              quantity: true,
              price: true,
              productName: true,
              productImage: true,
              productId: true,
              // Only the product name from product relation — no full object
              product: { select: { id: true, name: true } }
            }
          },
          // Tracking events for detail modal
          trackingEvents: { orderBy: { eventDate: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.order.count({ where: statusFilter }),
    ]);

    res.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};


export const getUserOrderHistory = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { 
        orderItems: { include: { product: true } },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const publicTrackOrder = async (req, res, next) => {
  const { orderId, phone } = req.body;
  if (!orderId || !phone) {
    return next(new BadRequestError("Order ID and Phone Number are required."));
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const cleanPhone = phone.toString().replace(/\D/g, '');

    let order = await prisma.order.findFirst({
      where: isUuid ? { id: orderId } : { orderId },
      include: {
        orderItems: { include: { product: true } },
        trackingEvents: { orderBy: { eventDate: 'desc' } },
        payments: true,
        user: { select: { phone: true, name: true } }
      }
    });

    if (!order) {
      return next(new NotFoundError(`Order ${orderId} not found.`));
    }

    const orderPhone = order.shippingPhone ? order.shippingPhone.toString().replace(/\D/g, '') : '';
    const addressPhone = order.address?.phone ? order.address.phone.toString().replace(/\D/g, '') : '';
    const userPhone = order.user?.phone ? order.user.phone.toString().replace(/\D/g, '') : '';

    const matchesPhone = 
      (orderPhone && orderPhone.endsWith(cleanPhone)) || 
      (addressPhone && addressPhone.endsWith(cleanPhone)) ||
      (userPhone && userPhone.endsWith(cleanPhone));

    if (!matchesPhone) {
      return next(new ForbiddenError("Unauthorized: Mobile number does not match this order."));
    }

    // Auto sync tracking details if order is not delivered yet
    if (order.trackingNumber && order.status !== 'delivered') {
      try {
        const synced = await syncTracking(order.id, false);
        if (synced) {
          order = synced;
        }
      } catch (err) {
        console.error("Order sync error on public track:", err);
      }
    }

    res.json(augmentOrderTrackingEvents(order));
  } catch (error) {
    next(error);
  }
};

export const syncOrderTracking = async (req, res, next) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return next(new NotFoundError(`Order ${id} not found`));
    }

    if (!order.trackingNumber) {
      return next(new BadRequestError("No tracking number configured for this order."));
    }

    const synced = await syncTracking(order.id, true); // force sync
    
    // Fetch full order to return
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: { include: { product: true } },
        trackingEvents: { orderBy: { eventDate: 'desc' } },
        payments: true
      }
    });

    res.json({
      success: true,
      message: "Tracking synchronized successfully",
      order: augmentOrderTrackingEvents(updatedOrder)
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  const { id } = req.params;
  const { phone } = req.body;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const order = await prisma.order.findFirst({
      where: isUuid ? { id } : { orderId: id },
      include: { user: true }
    });

    if (!order) {
      return next(new NotFoundError(`Order ID ${id} not found`));
    }

    let isAuthorized = false;

    if (req.user) {
      if (req.user.role === 'admin' || order.userId === req.user.id) {
        isAuthorized = true;
      }
    } else if (phone) {
      const cleanPhone = phone.toString().replace(/\D/g, '');
      const orderPhone = order.shippingPhone ? order.shippingPhone.toString().replace(/\D/g, '') : '';
      const addressPhone = order.address?.phone ? order.address.phone.toString().replace(/\D/g, '') : '';
      const userPhone = order.user?.phone ? order.user.phone.toString().replace(/\D/g, '') : '';
      
      const matchesPhone = 
        (orderPhone && orderPhone.endsWith(cleanPhone)) || 
        (addressPhone && addressPhone.endsWith(cleanPhone)) ||
        (userPhone && userPhone.endsWith(cleanPhone));
        
      if (matchesPhone) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized: Please login or provide a matching phone number to cancel this order." });
    }

      if (order.status.toLowerCase() !== 'out_for_delivery') {
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled at this stage. Cancellation is only allowed when the order reaches your doorstep.`
        });
      }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        paymentStatus: String(order.paymentMethod).toUpperCase() === 'COD' ? 'failed' : order.paymentStatus
      }
    });

    try {
      await prisma.orderTrackingEvent.create({
        data: {
          orderId: order.id,
          message: 'Order cancelled by customer.',
          status: 'cancelled',
          eventDate: new Date()
        }
      });
    } catch (err) {
      console.error("Failed to add cancellation tracking event:", err);
    }

    res.json({
      success: true,
      message: 'Order has been cancelled successfully',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req, res, next) => {
  const { id } = req.params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const order = await prisma.order.findFirst({
      where: isUuid ? { id } : { orderId: id }
    });

    if (!order) {
      return next(new NotFoundError(`Order ID ${id} not found`));
    }

    await prisma.order.delete({
      where: { id: order.id }
    });

    res.json({
      success: true,
      message: 'Order has been deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllOrders = async (req, res, next) => {
  try {
    await prisma.order.deleteMany({});
    res.json({
      success: true,
      message: 'All orders have been cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};
