import prisma from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';
import jwt from 'jsonwebtoken';

// Helper function to keep product rating and review count exactly in sync with the database records
const syncProductMetrics = async (productId) => {
  const approvedReviews = await prisma.review.findMany({
    where: { productId: productId, status: 'approved' }
  });
  
  const reviewCount = approvedReviews.length;
  const avgRating = reviewCount > 0 
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount 
    : 0.0;
    
  await prisma.product.update({
    where: { id: productId },
    data: { 
      reviewCount: reviewCount,
      rating: Number(avgRating.toFixed(1)),
      averageRating: Number(avgRating.toFixed(1))
    }
  });
};

export const createReview = async (req, res, next) => {
  const { productId, rating, comment, title, images, customerName: customName, verifiedPurchase, purchaseMonth: customPurchaseMonth, createdAt } = req.body;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const customerName = (isAdmin && customName) ? customName : (req.user.name || "Anonymous");

  if (!productId || !rating || !comment) {
    return next(new BadRequestError("ProductId, rating score (1-5), and comment text are required."));
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return next(new NotFoundError("Product not found."));
    }

    let orderId = null;
    let purchaseMonth = customPurchaseMonth || "";

    if (!isAdmin) {
      // Backend order verification: find the user's most recent delivered order containing this product
      const order = await prisma.order.findFirst({
        where: {
          userId: userId,
          status: "delivered",
          orderItems: {
            some: {
              productId: productId
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!order) {
        return next(new BadRequestError("You can review this product after your order has been delivered."));
      }

      orderId = order.orderId;
      const purchaseDate = order.createdAt ? new Date(order.createdAt) : new Date();
      purchaseMonth = purchaseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    // Get client IP and Device details (User-Agent)
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || "";
    const device = req.headers['user-agent'] || "";

    const review = await prisma.review.create({
      data: {
        productId,
        userId: isAdmin ? null : userId,
        rating: Number(rating),
        comment,
        customerName,
        orderId,
        title: title || "",
        ipAddress,
        device,
        helpfulUsers: "[]",
        purchaseMonth,
        status: isAdmin ? "approved" : "pending",
        verifiedPurchase: verifiedPurchase !== false,
        ...(isAdmin && createdAt && { createdAt: new Date(createdAt) })
      }
    });

    if (images) {
      let parsedImages = [];
      if (typeof images === 'string') {
        try { parsedImages = JSON.parse(images); } catch(e){}
      } else if (Array.isArray(images)) {
        parsedImages = images;
      }

      if (parsedImages.length > 0) {
        await prisma.reviewImage.createMany({
          data: parsedImages.map(img => ({
            reviewId: review.id,
            productId: productId,
            imageUrl: img,
            thumbnailUrl: img, // simple mapping for now
            status: 'active'
          }))
        });
      }
    }

    // Ensure metrics are in sync
    await syncProductMetrics(productId);

    res.status(201).json({
      success: true,
      message: isAdmin ? "Review created successfully" : "Review registered for approval moderation",
      review
    });
  } catch (error) {
    next(error);
  }
};

export const checkReviewEligibility = async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const order = await prisma.order.findFirst({
      where: {
        userId: userId,
        status: "delivered",
        orderItems: {
          some: {
            productId: productId
          }
        }
      }
    });

    if (order) {
      return res.json({ eligible: true, orderId: order.orderId });
    } else {
      return res.json({ eligible: false, message: "You can review this product after your order has been delivered." });
    }
  } catch (error) {
    next(error);
  }
};

export const voteHelpful = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(new NotFoundError("Review not found."));
    }

    let helpfulUsers = [];
    if (review.helpfulUsers) {
      try {
        helpfulUsers = JSON.parse(review.helpfulUsers);
      } catch (e) {
        helpfulUsers = [];
      }
    }

    if (helpfulUsers.includes(userId)) {
      // Toggle off if already voted
      helpfulUsers = helpfulUsers.filter(uid => uid !== userId);
    } else {
      helpfulUsers.push(userId);
    }

    await prisma.review.update({
      where: { id },
      data: {
        helpfulUsers: JSON.stringify(helpfulUsers)
      }
    });

    res.json({
      success: true,
      helpfulCount: helpfulUsers.length,
      voted: helpfulUsers.includes(userId)
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsForProduct = async (req, res, next) => {
  const { productId } = req.params;
  const sort = req.query.sort || 'recent'; // recent | high_rating | low_rating | helpful | photo
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  // Extract optional logged in user to check voted helpful state
  let currentUserId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      currentUserId = decoded.id;
    } catch (e) {}
  } else if (authHeader) {
    try {
      const decoded = jwt.verify(authHeader, process.env.JWT_SECRET || 'secret');
      currentUserId = decoded.id;
    } catch (e) {}
  }

  try {
    // Fetch all approved reviews to calculate breakdown summary & sort in memory
    const allApprovedReviews = await prisma.review.findMany({
      where: { productId, status: 'approved' },
      include: { 
        user: { select: { name: true } },
        images: { where: { status: 'active' } }
      }
    });

    // Parse structures
    const formatted = allApprovedReviews.map(rev => {
      let parsedHelpfulUsers = [];
      try {
        parsedHelpfulUsers = typeof rev.helpfulUsers === 'string' ? JSON.parse(rev.helpfulUsers) : (rev.helpfulUsers || []);
      } catch (e) {
        parsedHelpfulUsers = [];
      }

      return {
        ...rev,
        helpfulCount: parsedHelpfulUsers.length,
        voted: currentUserId ? parsedHelpfulUsers.includes(currentUserId) : false
      };
    });

    // Calculate rating breakdown summary statistics
    const totalReviews = formatted.length;
    const avgRating = totalReviews > 0
      ? Number((formatted.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0.0;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const allImages = [];
    formatted.forEach(r => {
      const ratingKey = Math.round(r.rating);
      if (breakdown[ratingKey] !== undefined) {
        breakdown[ratingKey]++;
      }
      if (r.images && r.images.length > 0) {
        r.images.forEach(img => {
          allImages.push({
            reviewId: r.id,
            imageId: img.id,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl || img.imageUrl,
            customerName: r.customerName,
            rating: r.rating
          });
        });
      }
    });

    // Sort in memory
    if (sort === 'high_rating') {
      formatted.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'low_rating') {
      formatted.sort((a, b) => a.rating - b.rating);
    } else if (sort === 'helpful') {
      formatted.sort((a, b) => b.helpfulCount - a.helpfulCount);
    } else if (sort === 'photo') {
      formatted.sort((a, b) => {
        const aHas = a.images.length > 0 ? 1 : 0;
        const bHas = b.images.length > 0 ? 1 : 0;
        return bHas - aHas; // reviews with photos first
      });
    } else {
      // Default: recent
      formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Paginate in memory
    const startIndex = (page - 1) * limit;
    const paginatedReviews = formatted.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(totalReviews / limit);

    res.json({
      success: true,
      reviews: paginatedReviews,
      totalCount: totalReviews,
      totalPages,
      currentPage: page,
      averageRating: avgRating,
      breakdown,
      allImages
    });
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status, rating, comment, customerName, title, purchaseMonth, verifiedPurchase, createdAt, images } = req.body;

  try {
    const updateData = {};
    if (status) {
      if (!['pending', 'approved', 'rejected', 'hidden'].includes(status)) {
        return next(new BadRequestError("Moderation status must be 'pending', 'approved', 'rejected', or 'hidden'."));
      }
      updateData.status = status;
    }
    if (rating !== undefined) updateData.rating = Number(rating);
    if (comment !== undefined) updateData.comment = comment;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (title !== undefined) updateData.title = title;
    if (purchaseMonth !== undefined) updateData.purchaseMonth = purchaseMonth;
    if (verifiedPurchase !== undefined) {
      updateData.verifiedPurchase = verifiedPurchase === true || verifiedPurchase === 'true';
    }
    if (createdAt !== undefined) {
      updateData.createdAt = new Date(createdAt);
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData
    });

    if (images !== undefined) {
      // Replace review images
      await prisma.reviewImage.deleteMany({
        where: { reviewId: id }
      });

      let parsedImages = [];
      if (typeof images === 'string') {
        try { parsedImages = JSON.parse(images); } catch(e){}
      } else if (Array.isArray(images)) {
        parsedImages = images;
      }

      if (parsedImages.length > 0) {
        await prisma.reviewImage.createMany({
          data: parsedImages.map(img => ({
            reviewId: id,
            productId: review.productId,
            imageUrl: img,
            thumbnailUrl: img,
            status: 'active'
          }))
        });
      }
    }

    // Re-calculate product global average rating and total count based on approved reviews
    await syncProductMetrics(review.productId);

    res.json({
      success: true,
      message: `Review updated successfully`,
      review
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  const { id } = req.params;

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(new NotFoundError("Review not found."));
    }

    await prisma.review.delete({ where: { id } });
    
    // Sync after deletion
    await syncProductMetrics(review.productId);

    res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};
