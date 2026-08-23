import prisma from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';
import redisClient from '../config/redis.js';

/**
 * Parse JSON database fields safely.
 */
const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Format product for frontend.
 */
export const formatProduct = (product) => {
  if (!product) return null;

  const formatted = { ...product };

  formatted.images = parseJson(formatted.images, []);
  formatted.highlights = parseJson(formatted.highlights, []);
  formatted.specifications = parseJson(formatted.specifications, {});
  formatted.variants = parseJson(formatted.variants, {});
  formatted.relatedProducts = parseJson(formatted.relatedProducts, []);
  formatted.active = formatted.status === 'active';

  // Make the purchase count randomly higher than reviews count (at least 18 difference)
  const revCount = formatted.reviewCount || 0;
  const purCount = formatted.purchaseCount || 0;
  
  // Deterministic "random" value based on product ID so it doesn't jump around on reload
  const randomBump = formatted.id ? (formatted.id.charCodeAt(formatted.id.length - 1) % 40) : 15;
  const minPurchaseCount = revCount + 18 + randomBump;

  if (purCount < minPurchaseCount) {
    formatted.purchaseCount = minPurchaseCount;
  }

  return formatted;
};

export const formatProducts = (products) =>
  products.map(formatProduct);

/**
 * Remove ugly marketplace wording and create a short product name.
 *
 * Maximum: 6 words.
 */
export const makeShortProductName = (input) => {
  if (!input) return 'New Product';

  let name = String(input)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[|•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common marketplace/brand prefixes.
  name = name.replace(
    /^(arraystyle|meesho|generic|new|premium|best|original|latest|trendy|stylish|fashionable)\s+/i,
    ''
  );

  // Remove common marketing words.
  const removeWords = new Set([
    'premium',
    'best',
    'latest',
    'new',
    'original',
    'stylish',
    'trendy',
    'beautiful',
    'practical',
    'quality',
    'high',
    'quality',
    'multipurpose',
    'multi',
    'functional',
    'portable',
    'home',
    'use',
    'for',
    'the',
    'with',
    'and',
    'pack',
    'set',
    'pcs',
    'piece',
    'pieces',
    'combo',
    'offer',
    'sale',
  ]);

  const words = name
    .replace(/[,:;()[\]{}]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !removeWords.has(word.toLowerCase()));

  // Useful product-type replacements.
  const joined = words.join(' ');

  if (
    /sink/i.test(joined) &&
    /sponge/i.test(joined) &&
    /(caddy|organizer|organiser|rack|holder)/i.test(joined)
  ) {
    return 'Stainless Steel Sink Sponge Holder';
  }

  if (
    /vegetable/i.test(joined) &&
    /(rack|organizer|organiser|storage)/i.test(joined)
  ) {
    return 'Vegetable Storage Rack';
  }

  if (
    /kitchen/i.test(joined) &&
    /(storage|organizer|organiser|rack)/i.test(joined)
  ) {
    return 'Kitchen Storage Rack';
  }

  if (
    /shirt/i.test(joined) &&
    /cotton/i.test(joined)
  ) {
    return 'Cotton Shirt';
  }

  if (
    /shirt/i.test(joined) &&
    /printed/i.test(joined)
  ) {
    return 'Printed Shirt';
  }

  if (
    /mini/i.test(joined) &&
    /fan/i.test(joined)
  ) {
    return 'Mini Portable Fan';
  }

  // Generic fallback: maximum 6 words.
  const shortName = words
    .slice(0, 6)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return shortName || 'New Product';
};

/**
 * Safely clear product cache using SCAN
 */
const clearProductsCache = async () => {
  try {
    let cursor = '0';
    do {
      const res = await redisClient.scan(cursor, 'MATCH', 'products:*', 'COUNT', 100);
      cursor = res[0];
      const keys = res[1];
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    // Redis optional.
  }
};

/**
 * GET ALL PRODUCTS
 */
export const getAllProducts = async (req, res, next) => {
  const { category, search } = req.query;

  const cacheKey =
    `products:cat_${category || 'all'}:search_${search || 'all'}`;

  try {
    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return res.json(formatProducts(JSON.parse(cached)));
      }
    } catch {
      // Redis is optional.
    }

    const products = await prisma.product.findMany({
      where: {
        status: 'active',

        ...(category && {
          category: {
            slug: category,
          },
        }),

        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      },

      include: {
        category: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(products),
        'EX',
        300
      );
    } catch {
      // Redis is optional.
    }

    res.json(formatProducts(products));
  } catch (error) {
    next(error);
  }
};

/**
 * GET PRODUCT BY ID
 */
export const getProductById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },

      include: {
        category: true,
        reviews: {
          where: {
            status: 'approved',
          },
        },
      },
    });

    if (!product) {
      return next(
        new NotFoundError(`Product SKU ID ${id} not found`)
      );
    }

    if (product.reviews) {
      product.reviews = product.reviews.map((review) => ({
        ...review,
        images: parseJson(review.images, []),
      }));
    }

    res.json(formatProduct(product));
  } catch (error) {
    next(error);
  }
};

/**
 * CREATE PRODUCT
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      tagline,
      description,
      price,
      originalPrice,
      categoryId,
      stock,
      seller,
      images,
      codPrice,
      onlinePrice,
      onlineDiscount,
      enableOnlineDiscount,
      codAvailable,
      prepaidAvailable,
      returnAvailable,
      returnWindow,
      returnPolicy,
      inStock,
      highlights,
      specifications,
      variants,
      relatedProducts,
      estimatedDeliveryDays,
      showPurchaseCount,
      purchaseCountMode,
      purchaseCount,
      active,
    } = req.body;

    const normalizedName = makeShortProductName(name);

    if (!normalizedName || !price || !categoryId) {
      return next(
        new BadRequestError(
          'Product name, price, and categoryId are required fields.'
        )
      );
    }

    // Make sure category really exists.
    const category = await prisma.category.findUnique({
      where: {
        id: String(categoryId),
      },
    });

    if (!category) {
      return next(
        new BadRequestError(
          'Selected product category does not exist.'
        )
      );
    }

    const product = await prisma.product.create({
      data: {
        name: normalizedName,

        tagline:
          tagline ||
          `${normalizedName} for everyday use.`,

        description: description || null,

        price: Number(price),

        originalPrice:
          originalPrice !== null &&
            originalPrice !== undefined &&
            originalPrice !== ''
            ? Number(originalPrice)
            : null,

        categoryId: String(categoryId),

        stock: 9999,

        seller:
          seller ||
          'RK Peedika',

        images:
          Array.isArray(images)
            ? JSON.stringify(images)
            : images || '[]',

        codPrice:
          codPrice !== null &&
            codPrice !== undefined &&
            codPrice !== ''
            ? Number(codPrice)
            : null,

        onlinePrice:
          onlinePrice !== null &&
            onlinePrice !== undefined &&
            onlinePrice !== ''
            ? Number(onlinePrice)
            : null,

        onlineDiscount:
          onlineDiscount !== null &&
            onlineDiscount !== undefined &&
            onlineDiscount !== ''
            ? Number(onlineDiscount)
            : null,

        enableOnlineDiscount:
          enableOnlineDiscount === true ||
          enableOnlineDiscount === 'true',

        codAvailable:
          codAvailable !== false &&
          codAvailable !== 'false',

        prepaidAvailable:
          prepaidAvailable !== false &&
          prepaidAvailable !== 'false',

        returnAvailable:
          returnAvailable !== false &&
          returnAvailable !== 'false',

        returnWindow:
          returnWindow !== undefined && returnWindow !== null && returnWindow !== ''
            ? Number(returnWindow)
            : 3,

        returnPolicy:
          returnPolicy || '',

        inStock: true,

        estimatedDeliveryDays:
          estimatedDeliveryDays
            ? Number(estimatedDeliveryDays)
            : 3,

        highlights:
          Array.isArray(highlights)
            ? JSON.stringify(highlights)
            : highlights || '[]',

        specifications:
          specifications &&
            typeof specifications === 'object'
            ? JSON.stringify(specifications)
            : specifications || '{}',

        variants:
          variants &&
            typeof variants === 'object'
            ? JSON.stringify(variants)
            : variants || '{}',

        relatedProducts:
          Array.isArray(relatedProducts)
            ? JSON.stringify(relatedProducts)
            : relatedProducts || '[]',

        ...(showPurchaseCount !== undefined && {
          showPurchaseCount:
            showPurchaseCount === true ||
            showPurchaseCount === 'true',
        }),

        ...(purchaseCountMode && {
          purchaseCountMode,
        }),

        ...(purchaseCount !== null &&
          purchaseCount !== undefined &&
          purchaseCount !== '' && {
          purchaseCount: Number(purchaseCount),
        }),

        status: active === false || active === 'false' ? 'draft' : 'active',
      },
    });

    // Clear product cache.
    await clearProductsCache();

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: formatProduct(product),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE PRODUCT
 */
export const updateProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    const {
      name,
      tagline,
      description,
      price,
      originalPrice,
      categoryId,
      stock,
      seller,
      images,
      codPrice,
      onlinePrice,
      onlineDiscount,
      enableOnlineDiscount,
      codAvailable,
      prepaidAvailable,
      returnAvailable,
      returnWindow,
      returnPolicy,
      highlights,
      specifications,
      variants,
      relatedProducts,
      estimatedDeliveryDays,
      active,
    } = req.body;

    const data = {};

    if (active !== undefined) {
      data.status = active === false || active === 'false' ? 'draft' : 'active';
    }

    if (name) data.name = makeShortProductName(name);
    if (tagline !== undefined) data.tagline = tagline;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    
    if (originalPrice !== undefined) {
      data.originalPrice = originalPrice === '' || originalPrice === null ? null : Number(originalPrice);
    }
    if (categoryId) data.categoryId = String(categoryId);
    
    if (codPrice !== undefined) {
      data.codPrice = codPrice === '' || codPrice === null ? null : Number(codPrice);
    }
    if (onlinePrice !== undefined) {
      data.onlinePrice = onlinePrice === '' || onlinePrice === null ? null : Number(onlinePrice);
    }
    if (onlineDiscount !== undefined) {
      data.onlineDiscount = onlineDiscount === '' || onlineDiscount === null ? null : Number(onlineDiscount);
    }

    if (estimatedDeliveryDays !== undefined) {
      data.estimatedDeliveryDays = Number(estimatedDeliveryDays);
    }

    if (enableOnlineDiscount !== undefined) {
      data.enableOnlineDiscount = enableOnlineDiscount === true || enableOnlineDiscount === 'true';
    }

    if (codAvailable !== undefined) {
      data.codAvailable = codAvailable !== false && codAvailable !== 'false';
    }

    if (prepaidAvailable !== undefined) {
      data.prepaidAvailable = prepaidAvailable !== false && prepaidAvailable !== 'false';
    }

    if (returnAvailable !== undefined) {
      data.returnAvailable = returnAvailable !== false && returnAvailable !== 'false';
    }

    if (returnWindow !== undefined) {
      data.returnWindow = returnWindow === '' || returnWindow === null ? 3 : Number(returnWindow);
    }

    if (returnPolicy !== undefined) {
      data.returnPolicy = returnPolicy || '';
    }

    data.inStock = true;
    data.stock = 9999;

    if (images !== undefined) {
      data.images = Array.isArray(images) ? JSON.stringify(images) : images || '[]';
    }

    if (highlights !== undefined) {
      data.highlights = Array.isArray(highlights) ? JSON.stringify(highlights) : highlights || '[]';
    }

    if (specifications !== undefined) {
      data.specifications = typeof specifications === 'object' ? JSON.stringify(specifications) : specifications || '{}';
    }

    if (variants !== undefined) {
      data.variants = typeof variants === 'object' ? JSON.stringify(variants) : variants || '{}';
    }

    if (relatedProducts !== undefined) {
      data.relatedProducts = Array.isArray(relatedProducts) ? JSON.stringify(relatedProducts) : relatedProducts || '[]';
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    await clearProductsCache();

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product: formatProduct(product),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE PRODUCT
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(
        new NotFoundError('Product not found.')
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    await clearProductsCache();

    res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};