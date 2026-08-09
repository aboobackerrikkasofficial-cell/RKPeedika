import {
  fetchProductFromUrl,
  importProductFromHtml
} from '../services/import.service.js';

import {
  BadRequestError
} from '../utils/appError.js';

const cleanProductName = (name) => {
  if (!name) {
    return 'Product';
  }

  let cleaned = String(name)
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  /*
   * Remove common Meesho marketing garbage.
   */
  cleaned = cleaned
    .replace(
      /\b(classy|stylish|premium|best|latest|new|trending|practical|useful|multipurpose)\b/gi,
      ''
    )
    .replace(
      /\b(home|kitchen|household|daily use|storage)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  /*
   * Remove everything after common separators.
   */
  cleaned = cleaned
    .split(/[,|:;–—]/)[0]
    .trim();

  /*
   * Maximum 6 words.
   */
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 6) {
    cleaned = words
      .slice(0, 6)
      .join(' ');
  }

  /*
   * Make sure the title isn't empty.
   */
  if (!cleaned) {
    return 'New Product';
  }

  return cleaned;
};

const normalizeImportedProduct = (product) => {
  if (!product) {
    return product;
  }

  const normalized = {
    ...product
  };

  normalized.name =
    cleanProductName(product.name);

  if (
    Array.isArray(normalized.images)
  ) {
    normalized.images =
      normalized.images.filter(Boolean);
  } else {
    normalized.images = [];
  }

  normalized.highlights =
    Array.isArray(normalized.highlights)
      ? normalized.highlights
      : [];

  normalized.specifications =
    normalized.specifications &&
      typeof normalized.specifications === 'object'
      ? normalized.specifications
      : {};

  normalized.variants =
    normalized.variants &&
      typeof normalized.variants === 'object'
      ? normalized.variants
      : {};

  normalized.description =
    normalized.description || '';

  normalized.estimatedDeliveryDays =
    Number(
      normalized.estimatedDeliveryDays || 3
    );

  return normalized;
};

export const importFromMeesho = async (
  req,
  res,
  next
) => {
  try {
    let {
      url,
      html,
      markupType,
      markupValue
    } = req.body || {};

    url = url
      ? String(url).trim()
      : '';

    html = html
      ? String(html)
      : '';

    /*
     * If HTML was pasted into the URL field,
     * automatically detect it.
     */
    if (
      !html &&
      url &&
      (
        url.startsWith('<') ||
        url.includes('<html') ||
        url.includes('<!DOCTYPE')
      )
    ) {
      html = url;
      url = '';
    }

    if (!url && !html) {
      return next(
        new BadRequestError(
          'Meesho product link URL or HTML source is required.'
        )
      );
    }

    if (url) {
      try {
        const parsedUrl = new URL(url);

        if (
          !parsedUrl.hostname
            .toLowerCase()
            .includes('meesho.com')
        ) {
          return next(
            new BadRequestError(
              'Please provide a valid Meesho product URL.'
            )
          );
        }
      } catch {
        return next(
          new BadRequestError(
            'Invalid Meesho URL.'
          )
        );
      }
    }

    const numericMarkup =
      Number(markupValue);

    const adminMarkup = {
      type:
        markupType === 'flat'
          ? 'flat'
          : 'percentage',

      value:
        Number.isFinite(numericMarkup)
          ? numericMarkup
          : 15
    };

    let productDetails;

    if (html.trim()) {
      productDetails =
        await importProductFromHtml(
          html,
          url,
          adminMarkup
        );
    } else {
      productDetails =
        await fetchProductFromUrl(
          url,
          adminMarkup
        );
    }

    if (!productDetails) {
      return next(
        new BadRequestError(
          'Could not extract product information from Meesho.'
        )
      );
    }

    const normalized =
      normalizeImportedProduct(
        productDetails
      );

    res.status(200).json({
      success: true,

      message:
        'Product imported successfully.',

      data: normalized
    });
  } catch (error) {
    console.error(
      '[MEESHO IMPORT ERROR]',
      error
    );

    next(error);
  }
};