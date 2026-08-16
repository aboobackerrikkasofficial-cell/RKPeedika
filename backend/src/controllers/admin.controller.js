import prisma from '../config/db.js';
import redisClient from '../config/redis.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';
import { formatProduct } from './product.controller.js';

export const getDashboardKPIs = async (req, res, next) => {
  try {
    const totalProducts = await prisma.product.count();
    const activeProducts = await prisma.product.count({ where: { status: 'active' } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.count({
      where: { createdAt: { gte: startOfToday } }
    });

    const pendingOrders = await prisma.order.count({
      where: { status: { notIn: ['delivered', 'completed', 'cancelled'] } }
    });

    const deliveredOrders = await prisma.order.count({
      where: { status: { in: ['delivered', 'completed'] } }
    });

    const ordersPaid = await prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { amount: true }
    });

    const totalRevenue = ordersPaid.reduce((sum, ord) => sum + ord.amount, 0);

    res.json({
      success: true,
      metrics: {
        totalRevenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
        totalRevenueRaw: totalRevenue,
        totalProducts,
        activeProducts,
        todayOrders,
        pendingOrders,
        deliveredOrders,
        completedOrders: deliveredOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ALL PRODUCTS (Admin — includes inactive/draft)
 */
export const getAdminProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      products: products.map(formatProduct)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * TOGGLE PRODUCT STATUS (Admin quick activate/deactivate)
 */
export const toggleProductStatus = async (req, res, next) => {
  const { id } = req.params;
  const { active } = req.body;

  if (active === undefined) {
    return next(new BadRequestError('active field (true/false) is required.'));
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return next(new NotFoundError('Product not found.'));
    }

    const newStatus = active === true || active === 'true' ? 'active' : 'draft';

    const updated = await prisma.product.update({
      where: { id },
      data: { status: newStatus },
      include: { category: true }
    });

    // Invalidate product cache
    try {
      const keys = await redisClient.keys('products:*');
      for (const key of keys) {
        await redisClient.del(key);
      }
    } catch {
      // Redis optional
    }

    res.json({
      success: true,
      message: `Product ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`,
      product: formatProduct(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    // 1. Calculate weekly sales trend (last 7 days)
    const weeklySalesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      
      const orders = await prisma.order.findMany({
        where: {
          paymentStatus: 'paid',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        select: { amount: true }
      });
      
      const daySales = orders.reduce((sum, o) => sum + o.amount, 0);
      weeklySalesTrend.push({ name: dayName, Sales: daySales });
    }

    // 2. Calculate monthly performance trend (last 6 months)
    const monthlySalesTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const orders = await prisma.order.findMany({
        where: {
          paymentStatus: 'paid',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        select: { amount: true }
      });
      
      const revenue = orders.reduce((sum, o) => sum + o.amount, 0);
      const profit = Math.round(revenue * 0.35); // 35% standard profit estimate
      monthlySalesTrend.push({ month: monthName, Revenue: revenue, Profit: profit });
    }

    // 3. Category distribution (Orders count by category)
    const categories = await prisma.category.findMany({
      include: {
        products: {
          select: {
            orderItems: {
              select: {
                quantity: true
              }
            }
          }
        }
      }
    });

    const categoryDistribution = categories.map(cat => {
      let orderCount = 0;
      cat.products.forEach(p => {
        p.orderItems.forEach(item => {
          orderCount += item.quantity;
        });
      });
      return {
        name: cat.name,
        Orders: orderCount
      };
    });

    // 4. Payment channel share (Direct COD vs. Online Razorpay)
    const codOrders = await prisma.order.count({ where: { paymentMethod: 'COD', paymentStatus: 'paid' } });
    const onlineOrders = await prisma.order.count({ where: { paymentMethod: 'Razorpay', paymentStatus: 'paid' } });
    const totalPaidOrders = codOrders + onlineOrders;

    const channelData = [
      { name: 'Cash On Delivery (COD)', value: totalPaidOrders > 0 ? Math.round((codOrders / totalPaidOrders) * 100) : 0 },
      { name: 'Online Payments (Razorpay)', value: totalPaidOrders > 0 ? Math.round((onlineOrders / totalPaidOrders) * 100) : 0 }
    ];

    // 5. Overall statistics
    const totalRevenuePaid = await prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { amount: true }
    });
    const gmv = totalRevenuePaid.reduce((sum, o) => sum + o.amount, 0);
    const totalCustomers = await prisma.user.count({ where: { role: 'customer' } });
    const totalOrders = await prisma.order.count();
    const averageOrderValue = totalOrders > 0 ? Math.round(gmv / totalOrders) : 0;

    res.json({
      success: true,
      weeklySalesTrend,
      monthlySalesTrend,
      categoryDistribution,
      channelData,
      gmv: `₹${gmv.toLocaleString('en-IN')}`,
      totalCustomers,
      averageOrderValue: `₹${averageOrderValue.toLocaleString('en-IN')}`,
      netProfitMargin: gmv > 0 ? "35.0%" : "0.0%"
    });
  } catch (error) {
    next(error);
  }
};

export const restockProduct = async (req, res, next) => {
  const { productId, quantity, reason } = req.body;

  if (!productId || !quantity || Number(quantity) <= 0) {
    return next(new BadRequestError("ProductId and a positive restock quantity are required."));
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return next(new NotFoundError("Product SKU ID does not exist."));
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: Number(quantity) } }
      });

      await tx.inventoryLog.create({
        data: {
          productId,
          quantityChange: Number(quantity),
          type: "restock",
          reason: reason || "Manual warehouse replenishment"
        }
      });

      return p;
    });

    res.json({
      success: true,
      message: `Refilled ${quantity} units of ${updatedProduct.name}`,
      product: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};
