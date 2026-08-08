import prisma from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';

export const getDashboardKPIs = async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'customer' } });
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    
    const ordersPaid = await prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { amount: true }
    });
    
    const totalRevenue = ordersPaid.reduce((sum, ord) => sum + ord.amount, 0);

    // Fetch low stock items
    const lowStockProducts = await prisma.product.findMany({
      where: { stock: { lte: 10 } },
      select: { id: true, name: true, stock: true }
    });

    res.json({
      success: true,
      metrics: {
        totalRevenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
        totalOrders,
        totalCustomers: totalUsers,
        lowStockAlerts: lowStockProducts.length
      },
      lowStockList: lowStockProducts
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
