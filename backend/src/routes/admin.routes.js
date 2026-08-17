import { Router } from 'express';
import { getDashboardKPIs, getAnalytics, restockProduct, getAdminProducts, toggleProductStatus } from '../controllers/admin.controller.js';
import { importFromMeesho } from '../controllers/meesho.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

router.post('/import/meesho', authenticate, authorize('admin'), importFromMeesho);

// --- Admin Products (all statuses) ---
router.get('/products', authenticate, authorize('admin'), getAdminProducts);
router.patch('/products/:id/status', authenticate, authorize('admin'), toggleProductStatus);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Retrieve aggregate operations dashboard statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard KPIs and list of low stock items returned
 */
router.get('/dashboard', authenticate, authorize('admin'), getDashboardKPIs);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Retrieve detailed store performance analytics trends (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data for sales trend and categories distribution
 */
router.get('/analytics', authenticate, authorize('admin'), getAnalytics);

/**
 * @swagger
 * /api/admin/inventory/restock:
 *   post:
 *     summary: Restock inventory quantity (Admin and Seller only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 example: 50
 *               reason:
 *                 type: string
 *                 example: Restock from vendor
 *     responses:
 *       200:
 *         description: Product quantity refilled
 */
router.post('/inventory/restock', authenticate, authorize('admin', 'seller'), restockProduct);

// --- Newsletter Admin Routes ---
router.get('/newsletter/subscribers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' }
    });
    res.status(200).json({ status: 'success', data: subscribers });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.delete('/newsletter/subscribers/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.newsletterSubscriber.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Subscriber deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// --- Exchange Requests Admin Routes ---
router.get('/exchanges', authenticate, authorize('admin'), async (req, res) => {
  try {
    const exchanges = await prisma.exchangeRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const formatted = exchanges.map(ex => {
      if (typeof ex.images === 'string') {
        try { ex.images = JSON.parse(ex.images); } catch (e) { ex.images = []; }
      }
      return ex;
    });
    res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/exchanges/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid status' });
    }

    const exchange = await prisma.exchangeRequest.update({
      where: { id },
      data: { status, notes: notes || undefined }
    });
    
    res.status(200).json({ status: 'success', data: exchange, message: `Exchange request ${status}` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// --- Reviews Admin Routes ---
router.get('/reviews', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { productId } = req.query;
    const reviews = await prisma.review.findMany({
      where: productId ? { productId } : {},
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const formatted = reviews.map(rev => {
      if (typeof rev.images === 'string') {
        try { 
          const urls = JSON.parse(rev.images); 
          rev.images = urls.map((url, idx) => ({ id: `legacy-${idx}`, imageUrl: url, status: 'active' }));
        } catch (e) { rev.images = []; }
      }
      return rev;
    });
    res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/reviews/images/:imageId/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const { imageId } = req.params;
    if (!imageId.startsWith('legacy-')) {
      await prisma.reviewImage.update({ where: { id: imageId }, data: { status } });
    }
    res.status(200).json({ status: 'success', message: `Image status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.delete('/reviews/images/:imageId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { imageId } = req.params;
    if (!imageId.startsWith('legacy-')) {
      await prisma.reviewImage.delete({ where: { id: imageId } });
    }
    res.status(200).json({ status: 'success', message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});


router.put('/reviews/:id/reply', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reply } = req.body;
    const { id } = req.params;

    const review = await prisma.review.update({
      where: { id },
      data: { reply }
    });

    res.status(200).json({ status: 'success', data: review, message: 'Review reply saved successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});


// --- Trust Badges Admin Routes ---
router.get('/badges', authenticate, authorize('admin'), async (req, res) => {
  try {
    const badges = await prisma.trustBadge.findMany({
      orderBy: { order: 'asc' }
    });
    res.status(200).json({ status: 'success', data: badges });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/badges/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, iconName, isVisible, order, actionUrl } = req.body;
    const { id } = req.params;

    const badge = await prisma.trustBadge.update({
      where: { id },
      data: {
        title,
        description,
        iconName,
        isVisible,
        order: Number(order),
        actionUrl: actionUrl || null
      }
    });

    res.status(200).json({ status: 'success', data: badge, message: 'Badge updated successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/badges/seed', authenticate, authorize('admin'), async (req, res) => {
  try {
    const count = await prisma.trustBadge.count();
    if (count > 0) {
      return res.status(400).json({ status: 'fail', message: 'Badges are already seeded' });
    }

    const initialBadges = [
      { title: "100% Secure Payments", description: "SSL Protected Transactions", iconName: "ShieldCheck", order: 1 },
      { title: "Cash On Delivery", description: "Pay at your doorstep", iconName: "Banknote", order: 2 },
      { title: "Fast Delivery Across India", description: "Quick delivery to your doorstep", iconName: "Truck", order: 3 },
      { title: "Easy Exchange", description: "Exchange requests accepted within 3 days of delivery. No Refunds • Exchange Only", iconName: "RotateCcw", order: 4 },
      { title: "Quality Checked Products", description: "Carefully selected products", iconName: "CheckSquare", order: 5 },
      { title: "Customer Support", description: "Support via WhatsApp & Email", iconName: "Headphones", actionUrl: "mailto:rikkas.aboo@gmail.com", order: 6 }
    ];

    await prisma.trustBadge.createMany({
      data: initialBadges
    });

    res.status(201).json({ status: 'success', message: 'Successfully seeded 6 default badges' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

function formatRelativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

router.get('/notifications', authenticate, authorize('admin'), async (req, res) => {
  try {
    const logs = [];
    
    // 1. Fetch recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });
    
    recentOrders.forEach(order => {
      logs.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `New Order Placed #${order.orderId}`,
        detail: `${order.shippingName || order.user.name || 'Customer'} placed an order for ₹${order.amount.toLocaleString('en-IN')}.`,
        time: formatRelativeTime(order.createdAt),
        unread: order.status === 'pending'
      });
    });
    
    // 2. Fetch low stock products (Removed per simplified inventory model)
    
    // 3. If empty, return a welcome log
    if (logs.length === 0) {
      logs.push({
        id: 'system-init',
        type: 'system',
        title: 'RK Peedika Database Online',
        detail: 'The production store database has initialized successfully. Waiting for real orders.',
        time: 'Just now',
        unread: false
      });
    }

    res.status(200).json({ status: 'success', data: logs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
