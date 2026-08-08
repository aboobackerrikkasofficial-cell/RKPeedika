import BaseImporter from './base.importer.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export default class MeeshoImporter extends BaseImporter {
  validateURL(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase().trim();
    // Match meesho.com domain
    return lowerUrl.includes('meesho.com') || lowerUrl.includes('meesho.co');
  }

  async fetchHTML(url) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.data;
    } catch (err) {
      console.error(`MeeshoImporter: fetchHTML failed for ${url}`, err.message);
      throw new Error(`Failed to download Meesho page: ${err.message}`);
    }
  }

  parseProduct(html, url) {
    if (!html) throw new Error("Empty HTML content received");

    const $ = cheerio.load(html);
    
    // Initialize parsed result with fallbacks
    let result = {
      name: '',
      description: '',
      price: null,
      originalPrice: null,
      discount: null,
      brand: 'Generic',
      images: [],
      variants: {
        sizes: [],
        colors: [],
        material: '',
        weight: '',
        packageContents: ''
      },
      specifications: {},
      highlights: [],
      rating: 4.2,
      reviewsCount: 18,
      estimatedDeliveryDays: 4,
      returnPolicy: '3-day easy exchange. Free return shipping.',
      sourceUrl: url
    };

    // Helper 1: Extract product ID from URL
    const extractProductIdFromUrl = (targetUrl) => {
      if (!targetUrl) return null;
      const match = targetUrl.match(/\/p\/([a-zA-Z0-9]+)/);
      if (match) return match[1];
      const match2 = targetUrl.match(/\/([a-zA-Z0-9]+)$/);
      if (match2) return match2[1];
      return null;
    };

    // Helper 2: Find product by specific ID in Next.js JSON
    const findProductById = (obj, targetId) => {
      if (!obj || typeof obj !== 'object') return null;
      if (String(obj.id) === String(targetId) || String(obj.productId) === String(targetId) || String(obj.product_id) === String(targetId)) {
        if (obj.name || obj.title) return obj;
      }
      for (const key of Object.keys(obj)) {
        const res = findProductById(obj[key], targetId);
        if (res) return res;
      }
      return null;
    };

    // Helper 3: Find product by description in Next.js JSON
    const findProductByDescription = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.name && obj.description && typeof obj.description === 'string' && obj.description.length > 30) {
        return obj;
      }
      for (const key of Object.keys(obj)) {
        const res = findProductByDescription(obj[key]);
        if (res) return res;
      }
      return null;
    };

    // Helper 4: Broad fallback search
    const findProductInJsonFallback = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.id && obj.name && (obj.price || obj.mrp || obj.images)) {
        return obj;
      }
      if (obj.productDetails && typeof obj.productDetails === 'object') return obj.productDetails;
      if (obj.product && typeof obj.product === 'object' && (obj.product.name || obj.product.title)) return obj.product;
      for (const key of Object.keys(obj)) {
        const res = findProductInJsonFallback(obj[key]);
        if (res) return res;
      }
      return null;
    };

    // Try parsing __NEXT_DATA__
    try {
      const nextDataText = $('#__NEXT_DATA__').html();
      if (nextDataText) {
        const nextData = JSON.parse(nextDataText);
        
        let productObj = null;

        // Strategy A: Targeted PageProps path
        const pageProps = nextData.props?.pageProps;
        if (pageProps) {
          productObj = pageProps.initialState?.product?.productDetails ||
                       pageProps.productDetails ||
                       pageProps.productData ||
                       pageProps.product ||
                       pageProps.data?.product;
        }

        // Strategy B: Match via URL Product ID
        if (!productObj && url) {
          const targetId = extractProductIdFromUrl(url);
          if (targetId) {
            productObj = findProductById(nextData, targetId);
          }
        }

        // Strategy C: Match via Description Length
        if (!productObj) {
          productObj = findProductByDescription(nextData);
        }

        // Strategy D: Fallback scanning
        if (!productObj) {
          productObj = findProductInJsonFallback(nextData);
        }

        if (productObj) {
          result.name = productObj.name || productObj.title || result.name;
          result.description = productObj.description || productObj.product_description || result.description;
          
          const rawPrice = productObj.price || productObj.discounted_price || productObj.selling_price;
          if (rawPrice) result.price = Number(rawPrice);

          const rawMrp = productObj.mrp || productObj.original_price || productObj.price_before_discount;
          if (rawMrp) result.originalPrice = Number(rawMrp);

          // Handle images array
          if (Array.isArray(productObj.images)) {
            result.images = productObj.images.map(img => {
              if (typeof img === 'string') return img;
              return img.url || img.src || '';
            }).filter(Boolean);
          } else if (Array.isArray(productObj.product_images)) {
            result.images = productObj.product_images.filter(Boolean);
          }

          // Handle specifications
          if (Array.isArray(productObj.product_attributes || productObj.attributes)) {
            const attrs = productObj.product_attributes || productObj.attributes;
            attrs.forEach(attr => {
              const key = attr.name || attr.key || '';
              const val = attr.value || '';
              if (key && val) {
                result.specifications[key] = val;
                if (key.toLowerCase().includes('brand')) {
                  result.brand = val;
                }
              }
            });
          }

          // Handle variants
          if (Array.isArray(productObj.sizes || productObj.available_sizes)) {
            result.variants.sizes = (productObj.sizes || productObj.available_sizes).map(s => s.name || s.value || s);
          }
          if (productObj.color || productObj.colors) {
            result.variants.colors = Array.isArray(productObj.colors) ? productObj.colors : [productObj.color];
          }

          // Rating / Reviews
          if (productObj.rating || productObj.average_rating) {
            result.rating = Number(productObj.rating || productObj.average_rating);
          }
          if (productObj.reviews_count || productObj.rating_count) {
            result.reviewsCount = Number(productObj.reviews_count || productObj.rating_count);
          }
        }
      }
    } catch (e) {
      console.warn("MeeshoImporter: Failed to parse NextJS structured state", e.message);
    }

    // Fallbacks via Cheerio selectors if data wasn't found in nextData JSON
    if (!result.name) {
      result.name = $('h1').first().text().trim() || 
                    $('meta[property="og:title"]').attr('content') || 
                    $('[class*="ProductTitle"]').first().text().trim();
    }
    
    if (!result.description) {
      result.description = $('[class*="ProductDescription"]').first().text().trim() || 
                           $('meta[property="og:description"]').attr('content') || 
                           $('[class*="Description"]').first().text().trim();
    }

    if (!result.price) {
      const priceText = $('[class*="Price"]').first().text().replace(/[^\d]/g, '');
      if (priceText) result.price = Number(priceText);
    }

    if (!result.originalPrice) {
      const mrpText = $('[class*="MRP"]').first().text().replace(/[^\d]/g, '') || 
                      $('[class*="StrikethroughPrice"]').first().text().replace(/[^\d]/g, '');
      if (mrpText) result.originalPrice = Number(mrpText);
    }

    if (result.images.length === 0) {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg) result.images.push(ogImg);

      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('meesho') || src.includes('images.meesho.com')) && !result.images.includes(src)) {
          result.images.push(src);
        }
      });
    }

    // Fill specifications from key value text lists on page if empty
    if (Object.keys(result.specifications).length === 0) {
      $('[class*="Attr"]').each((i, el) => {
        const text = $(el).text();
        if (text && text.includes(':')) {
          const parts = text.split(':');
          const key = parts[0].trim();
          const val = parts[1].trim();
          result.specifications[key] = val;
          if (key.toLowerCase().includes('brand')) {
            result.brand = val;
          }
        }
      });
    }

    // Clean description HTML and formatting
    if (result.description) {
      result.description = result.description
        .replace(/Meesho/gi, 'RK Peedika')
        .replace(/meesho\.com/gi, 'rkpeedika.com')
        .trim();
    }

    // Default calculations if original price is missing
    if (result.price && !result.originalPrice) {
      result.originalPrice = Math.round(result.price * 1.25);
    }
    if (result.price && result.originalPrice) {
      result.discount = Math.round(((result.originalPrice - result.price) / result.originalPrice) * 100);
    }

    // Fill out variants defaults
    result.variants.colors = result.variants.colors.length > 0 ? result.variants.colors : [result.specifications['Color'] || result.specifications['Colour'] || 'Default'];
    result.variants.material = result.specifications['Material'] || result.specifications['Fabric'] || 'Cotton';
    result.variants.weight = result.specifications['Weight'] || '250g';
    result.variants.packageContents = result.specifications['Package Contents'] || '1 Unit';

    // Parse Highlights list
    result.highlights = Object.entries(result.specifications).slice(0, 5).map(([k, v]) => `${k}: ${v}`);

    return result;
  }

  async downloadImages(imageUrls) {
    const downloadDir = path.resolve('./src/uploads/imported');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const downloadedPaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const url = imageUrls[i];
        if (!url || typeof url !== 'string' || !url.startsWith('http')) continue;

        const ext = path.extname(url).split('?')[0] || '.jpg';
        const filename = `meesho_${Date.now()}_${i}${ext}`;
        const destPath = path.join(downloadDir, filename);

        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Store relative path for client serving
        downloadedPaths.push(`/uploads/imported/${filename}`);
      } catch (err) {
        console.error(`MeeshoImporter: Failed to download image ${imageUrls[i]}`, err.message);
      }
    }
    return downloadedPaths;
  }

  mapCategory(scrapedCategory, categories) {
    if (!scrapedCategory) return null;
    const lower = scrapedCategory.toLowerCase();
    
    // Try exact or substring match
    const matched = categories.find(c => {
      const cName = c.name.toLowerCase();
      return cName.includes(lower) || lower.includes(cName);
    });
    if (matched) return matched;

    // Semantic keyword rules mapping
    if (lower.includes('kitchen') || lower.includes('cook') || lower.includes('dining') || lower.includes('cup') || lower.includes('bottle') || lower.includes('lunch') || lower.includes('brass')) {
      return categories.find(c => c.name.toLowerCase().includes('kitchen')) || null;
    }
    if (lower.includes('clean') || lower.includes('mop') || lower.includes('brush') || lower.includes('detergent') || lower.includes('wash') || lower.includes('wipe') || lower.includes('towel')) {
      return categories.find(c => c.name.toLowerCase().includes('cleaning')) || null;
    }
    if (lower.includes('garden') || lower.includes('plant') || lower.includes('outdoor') || lower.includes('seed') || lower.includes('pot') || lower.includes('tool') || lower.includes('pruner')) {
      return categories.find(c => c.name.toLowerCase().includes('garden')) || null;
    }
    if (lower.includes('car') || lower.includes('bike') || lower.includes('automotive') || lower.includes('vehicle') || lower.includes('helmet') || lower.includes('accessory')) {
      return categories.find(c => c.name.toLowerCase().includes('automotive')) || null;
    }
    if (lower.includes('health') || lower.includes('care') || lower.includes('personal') || lower.includes('beauty') || lower.includes('makeup') || lower.includes('shampoo') || lower.includes('skin')) {
      return categories.find(c => c.name.toLowerCase().includes('health')) || null;
    }

    return null;
  }

  calculatePricing(originalPrice, sellingPrice, adminMarkup = { type: 'percentage', value: 15 }) {
    const markupValue = Number(adminMarkup.value) || 0;
    let finalSellingPrice = sellingPrice;

    if (adminMarkup.type === 'flat') {
      finalSellingPrice = sellingPrice + markupValue;
    } else if (adminMarkup.type === 'percentage') {
      finalSellingPrice = Math.round(sellingPrice * (1 + markupValue / 100));
    }

    const profitMargin = finalSellingPrice - sellingPrice;
    
    // Set a proportional originalPrice/MRP if needed
    const finalOriginalPrice = Math.max(originalPrice, Math.round(finalSellingPrice * 1.25));

    return {
      price: finalSellingPrice,
      originalPrice: finalOriginalPrice,
      profitMargin
    };
  }
}
