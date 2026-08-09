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
      inStock,
      highlights,
      specifications,
      variants,
      relatedProducts,
      estimatedDeliveryDays,
      showPurchaseCount,
      purchaseCountMode,
      purchaseCount,
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

        stock:
          stock !== null &&
            stock !== undefined &&
            stock !== ''
            ? Number(stock)
            : 0,

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

        inStock:
          inStock !== false &&
          inStock !== 'false',

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

        status: 'active',
      },
    });

    // Clear product cache.
    try {
      const keys = await redisClient.keys('products:*');

      for (const key of keys) {
        await redisClient.del(key);
      }
    } catch {
      // Redis optional.
    }

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
    const data = {
      ...req.body,
    };

    if (data.name) {
      data.name = makeShortProductName(data.name);
    }

    if (data.price !== undefined) {
      data.price = Number(data.price);
    }

    if (data.stock !== undefined) {
      data.stock = Number(data.stock);
    }

    if (data.originalPrice !== undefined) {
      data.originalPrice =
        data.originalPrice === '' ||
          data.originalPrice === null
          ? null
          : Number(data.originalPrice);
    }

    if (data.codPrice !== undefined) {
      data.codPrice =
        data.codPrice === '' ||
          data.codPrice === null
          ? null
          : Number(data.codPrice);
    }

    if (data.onlinePrice !== undefined) {
      data.onlinePrice =
        data.onlinePrice === '' ||
          data.onlinePrice === null
          ? null
          : Number(data.onlinePrice);
    }

    if (data.onlineDiscount !== undefined) {
      data.onlineDiscount =
        data.onlineDiscount === '' ||
          data.onlineDiscount === null
          ? null
          : Number(data.onlineDiscount);
    }

    if (data.estimatedDeliveryDays !== undefined) {
      data.estimatedDeliveryDays =
        Number(data.estimatedDeliveryDays);
    }

    if (data.enableOnlineDiscount !== undefined) {
      data.enableOnlineDiscount =
        data.enableOnlineDiscount === true ||
        data.enableOnlineDiscount === 'true';
    }

    if (data.codAvailable !== undefined) {
      data.codAvailable =
        data.codAvailable !== false &&
        data.codAvailable !== 'false';
    }

    if (data.inStock !== undefined) {
      data.inStock =
        data.inStock !== false &&
        data.inStock !== 'false';
    }

    if (Array.isArray(data.images)) {
      data.images = JSON.stringify(data.images);
    }

    if (Array.isArray(data.highlights)) {
      data.highlights = JSON.stringify(data.highlights);
    }

    if (
      data.specifications &&
      typeof data.specifications === 'object'
    ) {
      data.specifications =
        JSON.stringify(data.specifications);
    }

    if (
      data.variants &&
      typeof data.variants === 'object'
    ) {
      data.variants =
        JSON.stringify(data.variants);
    }

    if (Array.isArray(data.relatedProducts)) {
      data.relatedProducts =
        JSON.stringify(data.relatedProducts);
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    try {
      const keys = await redisClient.keys('products:*');

      for (const key of keys) {
        await redisClient.del(key);
      }
    } catch {
      // Redis optional.
    }

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

    try {
      const keys = await redisClient.keys('products:*');

      for (const key of keys) {
        await redisClient.del(key);
      }
    } catch {
      // Redis optional.
    }

    res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};