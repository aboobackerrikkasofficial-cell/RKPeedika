import prisma from '../config/db.js';
import redisClient from '../config/redis.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';
import { formatProduct } from './product.controller.js';

export const getDashboardKPIs = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      activeProducts,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      ordersPaid
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: { notIn: ['delivered', 'completed', 'cancelled'] } } }),
      prisma.order.count({ where: { status: { in: ['delivered', 'completed'] } } }),
      prisma.order.findMany({ where: { paymentStatus: 'paid' }, select: { amount: true } })
    ]);

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
    // Calculate date boundaries
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Fetch all data in parallel instead of looped queries
    const [
      weeklyOrders,
      monthlyOrders,
      categories,
      codOrders,
      onlineOrders,
      totalRevenuePaid,
      totalCustomers,
      totalOrders
    ] = await Promise.all([
      prisma.order.findMany({
        where: { paymentStatus: 'paid', createdAt: { gte: sevenDaysAgo } },
        select: { amount: true, createdAt: true }
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'paid', createdAt: { gte: sixMonthsAgo } },
        select: { amount: true, createdAt: true }
      }),
      prisma.category.findMany({
        include: {
          products: {
            select: {
              orderItems: {
                select: { quantity: true }
              }
            }
          }
        }
      }),
      prisma.order.count({ where: { paymentMethod: 'COD', paymentStatus: 'paid' } }),
      prisma.order.count({ where: { paymentMethod: 'Razorpay', paymentStatus: 'paid' } }),
      prisma.order.findMany({ where: { paymentStatus: 'paid' }, select: { amount: true } }),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.order.count()
    ]);

    // 1. Aggregate weekly sales from fetched data
    const weeklySalesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

      const daySales = weeklyOrders
        .filter(o => {
          const t = new Date(o.createdAt).getTime();
          return t >= dayStart && t <= dayEnd;
        })
        .reduce((sum, o) => sum + o.amount, 0);

      weeklySalesTrend.push({ name: dayName, Sales: daySales });
    }

    // 2. Aggregate monthly sales from fetched data
    const monthlySalesTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const revenue = monthlyOrders
        .filter(o => {
          const t = new Date(o.createdAt).getTime();
          return t >= monthStart && t <= monthEnd;
        })
        .reduce((sum, o) => sum + o.amount, 0);

      const profit = Math.round(revenue * 0.35);
      monthlySalesTrend.push({ month: monthName, Revenue: revenue, Profit: profit });
    }

    // 3. Category distribution
    const categoryDistribution = categories.map(cat => {
      let orderCount = 0;
      cat.products.forEach(p => {
        p.orderItems.forEach(item => {
          orderCount += item.quantity;
        });
      });
      return { name: cat.name, Orders: orderCount };
    });

    // 4. Payment channel share
    const totalPaidOrders = codOrders + onlineOrders;
    const channelData = [
      { name: 'Cash On Delivery (COD)', value: totalPaidOrders > 0 ? Math.round((codOrders / totalPaidOrders) * 100) : 0 },
      { name: 'Online Payments (Razorpay)', value: totalPaidOrders > 0 ? Math.round((onlineOrders / totalPaidOrders) * 100) : 0 }
    ];

    // 5. Overall statistics
    const gmv = totalRevenuePaid.reduce((sum, o) => sum + o.amount, 0);
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
