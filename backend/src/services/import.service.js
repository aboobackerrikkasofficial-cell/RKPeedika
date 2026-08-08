import MeeshoImporter from './importers/meesho.importer.js';
import prisma from '../config/db.js';

const importers = [
  new MeeshoImporter()
];

function getMockMeeshoProduct(url) {
  let name = "Premium Handcrafted Brass Kamakshi Devi Diya (Pair)";
  let categoryStr = "Kitchen & Dining";
  let images = [
    "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800"
  ];

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("shirt") || lowerUrl.includes("kurti") || lowerUrl.includes("wear") || lowerUrl.includes("cotton")) {
    name = "Classic Cotton Printed Kurti Set with Dupatta";
    categoryStr = "Health & Personal Care";
    images = [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800"
    ];
  } else if (lowerUrl.includes("mop") || lowerUrl.includes("brush") || lowerUrl.includes("clean") || lowerUrl.includes("mops")) {
    name = "Microfiber Spin Mop with Bucket & Refills";
    categoryStr = "Cleaning Essentials";
    images = [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800"
    ];
  } else if (lowerUrl.includes("plant") || lowerUrl.includes("garden") || lowerUrl.includes("pot") || lowerUrl.includes("diyas")) {
    name = "Self-Watering Planter Pots (Set of 3)";
    categoryStr = "Garden & Outdoor";
    images = [
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800",
      "https://images.unsplash.com/photo-1509223197845-458d87318791?w=800"
    ];
  }

  return {
    name,
    description: `This high-quality product is curated for everyday comfort and utility. Crafted using premium materials and design processes to ensure longevity and high customer satisfaction.\n\nIdeal for gifting or personal usage. Package contains all necessary fittings and accessories.`,
    price: 499,
    originalPrice: 799,
    discount: 37,
    brand: "RK Dropship Gold",
    images,
    variants: {
      sizes: ["S", "M", "L", "XL"],
      colors: ["Red", "Blue", "Black"],
      material: "Premium Alloy & Polycarbonate",
      weight: "350g",
      packageContents: "1 Main Unit, 1 Warranty Card, 1 Instruction Leaflet"
    },
    specifications: {
      "Brand": "RK Dropship Gold",
      "Material": "Premium Composite",
      "Weight": "350g",
      "Model Number": "RKP-ME-779",
      "Warranty": "6 Months Limited Manufacturer Warranty",
      "Category": categoryStr
    },
    highlights: [
      "Crafted with heavy duty durable composite materials",
      "Ergonomic handle and safety lock feature included",
      "Highly efficient energy saving mechanism built-in",
      "Compact design, takes minimum counter space"
    ],
    rating: 4.5,
    reviewsCount: 36,
    estimatedDeliveryDays: 3,
    returnPolicy: "3-day easy exchange. Free return pickup.",
    sourceUrl: url
  };
}

export const fetchProductFromUrl = async (url, adminMarkup = { type: 'percentage', value: 15 }) => {
  const importer = importers.find(imp => imp.validateURL(url));
  if (!importer) {
    throw new Error("Unsupported website URL. Only Meesho product links are supported at this time.");
  }

  let html = null;
  try {
    html = await importer.fetchHTML(url);
  } catch (err) {
    throw new Error("Direct link import was blocked by Meesho's security checks. Please use the 'Paste Page Source HTML' option below: open the link in your browser, press Ctrl+U, copy all content, and paste it here to import accurately.");
  }

  if (!html) {
    throw new Error("Could not retrieve page source from Meesho. Please copy the Page Source HTML (Ctrl+U) and paste it below.");
  }

  let parsedProduct = null;
  try {
    parsedProduct = importer.parseProduct(html, url);
  } catch (err) {
    throw new Error(`Failed to parse product details: ${err.message}`);
  }

  // 3. Download and host images locally (prevent hotlinking)
  if (parsedProduct.images && parsedProduct.images.length > 0) {
    const localImages = await importer.downloadImages(parsedProduct.images);
    parsedProduct.images = localImages;
  }

  // 4. Load all categories from database for semantic mapping
  const categories = await prisma.category.findMany();

  // 5. Map category semantically
  const categorySourceText = parsedProduct.specifications['Category'] || 
                             parsedProduct.specifications['Type'] || 
                             parsedProduct.name || 
                             '';
  const categoryGuess = importer.mapCategory(categorySourceText, categories);
  
  parsedProduct.categoryId = categoryGuess ? categoryGuess.id : null;
  parsedProduct.mappedCategory = categoryGuess ? categoryGuess.name : null;

  // 6. Calculate markup pricing
  const pricing = importer.calculatePricing(
    parsedProduct.originalPrice || parsedProduct.price,
    parsedProduct.price,
    adminMarkup
  );
  
  parsedProduct.price = pricing.price;
  parsedProduct.originalPrice = pricing.originalPrice;
  parsedProduct.profitMargin = pricing.profitMargin;

  return parsedProduct;
};

export const importProductFromHtml = async (html, url, adminMarkup = { type: 'percentage', value: 15 }) => {
  const importer = importers[0]; // Use Meesho Importer

  if (!html || !html.trim()) {
    throw new Error("Pasted HTML page source is empty.");
  }

  // 1. Parse Product Details
  let parsedProduct;
  try {
    parsedProduct = importer.parseProduct(html, url || "https://www.meesho.com/imported-product");
  } catch (err) {
    console.error("importProductFromHtml: parsing error", err);
    throw new Error(`Failed to parse HTML source code. Verify that you copied the complete page source: ${err.message}`);
  }

  // 2. Download and host images locally (prevent hotlinking)
  if (parsedProduct.images && parsedProduct.images.length > 0) {
    const localImages = await importer.downloadImages(parsedProduct.images);
    parsedProduct.images = localImages;
  }

  // 3. Load all categories from database for semantic mapping
  const categories = await prisma.category.findMany();

  // 4. Map category semantically
  const categorySourceText = parsedProduct.specifications['Category'] || 
                             parsedProduct.specifications['Type'] || 
                             parsedProduct.name || 
                             '';
  const categoryGuess = importer.mapCategory(categorySourceText, categories);
  
  parsedProduct.categoryId = categoryGuess ? categoryGuess.id : null;
  parsedProduct.mappedCategory = categoryGuess ? categoryGuess.name : null;

  // 5. Calculate markup pricing
  const pricing = importer.calculatePricing(
    parsedProduct.originalPrice || parsedProduct.price,
    parsedProduct.price,
    adminMarkup
  );
  
  parsedProduct.price = pricing.price;
  parsedProduct.originalPrice = pricing.originalPrice;
  parsedProduct.profitMargin = pricing.profitMargin;

  return parsedProduct;
};
