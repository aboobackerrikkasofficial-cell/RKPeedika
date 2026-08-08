import prisma from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';
import redisClient from '../config/redis.js';

// Helper to format a product for client consumption by parsing SQLite JSON fields
export const formatProduct = (product) => {
  if (!product) return null;
  const formatted = { ...product };

  if (typeof formatted.images === 'string') {
    try { formatted.images = JSON.parse(formatted.images); } catch (e) { formatted.images = []; }
  }
  if (typeof formatted.highlights === 'string') {
    try { formatted.highlights = JSON.parse(formatted.highlights); } catch (e) { formatted.highlights = []; }
  }
  if (typeof formatted.specifications === 'string') {
    try { formatted.specifications = JSON.parse(formatted.specifications); } catch (e) { formatted.specifications = {}; }
  }
  if (typeof formatted.variants === 'string') {
    try { formatted.variants = JSON.parse(formatted.variants); } catch (e) { formatted.variants = {}; }
  }
  if (typeof formatted.relatedProducts === 'string') {
    try { formatted.relatedProducts = JSON.parse(formatted.relatedProducts); } catch (e) { formatted.relatedProducts = []; }
  }

  return formatted;
};

export const formatProducts = (products) => products.map(formatProduct);

export const getAllProducts = async (req, res, next) => {
  const { category, search } = req.query;
  const cacheKey = `products:cat_${category || 'all'}:search_${search || 'all'}`;

  try {
    // Attempt cache check
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(formatProducts(JSON.parse(cached)));
    }

    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        ...(category && { category: { slug: category } }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: { category: true }
    });

    // Cache products for 5 minutes
    await redisClient.set(cacheKey, JSON.stringify(products), 'EX', 300);

    res.json(formatProducts(products));
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, reviews: { where: { status: 'approved' } } }
    });

    if (!product) {
      return next(new NotFoundError(`Product SKU ID ${id} not found`));
    }

    // Parse product reviews images if they are strings
    if (product.reviews) {
      product.reviews = product.reviews.map(rev => {
        if (typeof rev.images === 'string') {
          try { rev.images = JSON.parse(rev.images); } catch (e) { rev.images = []; }
        }
        return rev;
      });
    }

    res.json(formatProduct(product));
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  const { 
    name, tagline, description, price, originalPrice, categoryId, stock, seller, images,
    codPrice, onlinePrice, onlineDiscount, enableOnlineDiscount, codAvailable, inStock,
    highlights, specifications, variants, relatedProducts, estimatedDeliveryDays
  } = req.body;

  if (!name || !price || !categoryId) {
    return next(new BadRequestError("Product name, price, and categoryId are required fields."));
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        tagline,
        description,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        categoryId,
        stock: stock ? Number(stock) : 0,
        seller: seller || "Kriti Merchant Store",
        images: images ? (typeof images === 'object' ? JSON.stringify(images) : images) : "[]",
        codPrice: codPrice ? Number(codPrice) : null,
        onlinePrice: onlinePrice ? Number(onlinePrice) : null,
        onlineDiscount: onlineDiscount ? Number(onlineDiscount) : null,
        enableOnlineDiscount: enableOnlineDiscount === true || enableOnlineDiscount === 'true',
        codAvailable: codAvailable !== false && codAvailable !== 'false',
        inStock: inStock !== false && inStock !== 'false',
        estimatedDeliveryDays: estimatedDeliveryDays ? Number(estimatedDeliveryDays) : 3,
        highlights: highlights ? (typeof highlights === 'object' ? JSON.stringify(highlights) : highlights) : null,
        specifications: specifications ? (typeof specifications === 'object' ? JSON.stringify(specifications) : specifications) : null,
        variants: variants ? (typeof variants === 'object' ? JSON.stringify(variants) : variants) : null,
        relatedProducts: relatedProducts ? (typeof relatedProducts === 'object' ? JSON.stringify(relatedProducts) : relatedProducts) : null,
        status: "active"
      }
    });

    // Clear product cache
    const keys = await redisClient.keys('products:*');
    for (const key of keys) {
      await redisClient.del(key);
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: formatProduct(product)
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updateData = { ...data };

    // Format serializations
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.stock) updateData.stock = Number(updateData.stock);
    if (updateData.originalPrice) updateData.originalPrice = Number(updateData.originalPrice);
    if (updateData.codPrice) updateData.codPrice = Number(updateData.codPrice);
    if (updateData.onlinePrice) updateData.onlinePrice = Number(updateData.onlinePrice);
    if (updateData.onlineDiscount) updateData.onlineDiscount = Number(updateData.onlineDiscount);
    if (updateData.estimatedDeliveryDays) updateData.estimatedDeliveryDays = Number(updateData.estimatedDeliveryDays);
    
    if (updateData.enableOnlineDiscount !== undefined) {
      updateData.enableOnlineDiscount = updateData.enableOnlineDiscount === true || updateData.enableOnlineDiscount === 'true';
    }
    if (updateData.codAvailable !== undefined) {
      updateData.codAvailable = updateData.codAvailable !== false && updateData.codAvailable !== 'false';
    }

    // Keep arrays/objects as strings if provided as JSON
    if (updateData.highlights && typeof updateData.highlights === 'object') {
      updateData.highlights = JSON.stringify(updateData.highlights);
    }
    if (updateData.specifications && typeof updateData.specifications === 'object') {
      updateData.specifications = JSON.stringify(updateData.specifications);
    }
    if (updateData.variants && typeof updateData.variants === 'object') {
      updateData.variants = JSON.stringify(updateData.variants);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
