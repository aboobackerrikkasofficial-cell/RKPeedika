import prisma from '../config/db.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/appError.js';

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
      message: `In transit: Package is moving towards the nearest delivery hub.`,
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
      message: 'Out for delivery: Package is with the delivery executive.',
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
      message: 'Package delivered successfully. Thank you for shopping with RK Peedika!',
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
  const { items, paymentMethod, pincode, addressId, couponCode, idempotencyKey } = req.body;
  const userId = req.user.id;

  if (!items || items.length === 0 || !pincode) {
    return next(new BadRequestError("Order items and delivery pincode are required."));
  }

  try {
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey } });
      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: "Order already placed",
          order: existingOrder
        });
      }
    }

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

    let subtotal = 0;
    const orderItemsData = [];
    let maxDeliveryDays = 4;

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return next(new NotFoundError(`Product ${item.productId} does not exist.`));
      }

      const itemPrice = paymentMethod === 'COD' 
        ? (product.codPrice || product.price) 
        : (product.onlinePrice || product.price);

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

    let paymentDiscount = 0;
    if (paymentMethod !== 'COD') {
      paymentDiscount = (subtotal - discount) * 0.12; 
    }

    const totalDiscount = discount + paymentDiscount;
    const finalAmount = Math.max(0, subtotal - totalDiscount);

    let orderPrefix = "ODR";
    if (orderItemsData.length > 0 && orderItemsData[0].productName) {
      orderPrefix = orderItemsData[0].productName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .replace(/[^A-Z]/g, '');
      if (orderPrefix.length === 0) orderPrefix = "ODR";
    }
    const userFacingOrderId = `${orderPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await prisma.$transaction(async (tx) => {
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

      // No stock decrement or inventory logging per simplified model.

      await tx.notification.create({
        data: {
          userId,
          title: `Order Placed Successfully`,
          detail: `Your order ${userFacingOrderId} of value ₹${finalAmount.toFixed(2)} is received.`,
          type: "order"
        }
      });

      await tx.cartItem.deleteMany({
        where: { userId }
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByOrderIdFormatted = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    
    const order = await prisma.order.findFirst({
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

    res.json(augmentOrderTrackingEvents(order));
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const order = await prisma.order.findFirst({
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

    res.json(augmentOrderTrackingEvents(order));
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { 
        status,
        ...(trackingNumber && { trackingNumber })
      }
    });

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
  const { courier, trackingNumber, trackingUrl, estimatedDelivery, shippedAt, deliveredAt, internalNotes, customerStatusMessage } = req.body;

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { 
        courier,
        trackingNumber,
        trackingUrl,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        shippedAt: shippedAt ? new Date(shippedAt) : undefined,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
        internalNotes,
        customerStatusMessage
      }
    });

    res.json({ success: true, message: "Tracking details updated", order });
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
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
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

    const order = await prisma.order.findFirst({
      where: isUuid ? { id: orderId } : { orderId },
      include: {
        orderItems: { include: { product: true } },
        trackingEvents: { orderBy: { eventDate: 'desc' } },
        payments: true,
        address: true,
        user: true
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

    res.json(augmentOrderTrackingEvents(order));
  } catch (error) {
    next(error);
  }
};
