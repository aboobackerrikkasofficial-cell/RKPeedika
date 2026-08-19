import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isDemoMode = args.includes('--demo');

  if (isDemoMode) {
    console.log('🌱 Starting database seeding operations with DEMO DATA for RK Peedika...');
  } else {
    console.log('🚀 Starting database seeding operations for PRODUCTION mode...');
  }

  // 1. Create Default Admin User
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    let adminUser = existingAdmin;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (!existingAdmin) {
      // Clean up any legacy placeholder admin accounts
      await prisma.user.delete({ where: { email: 'admin@kritimarketplace.com' } }).catch(() => {});
      await prisma.user.delete({ where: { email: '9188072646@gmail.com' } }).catch(() => {});

      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin',
          role: 'admin'
        }
      });
      console.log('✔ Default administrator account generated.');
    }
  } else {
    console.log('⚠ ADMIN_EMAIL or ADMIN_PASSWORD not provided, skipping default admin creation.');
  }

  // Clean relations to prevent constraints violation / clear existing demo data
  await prisma.reviewImage.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.orderTrackingEvent.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  
  // Clean up demo customers (keep admin and active sessions/users if they are not demo)
  // Delete the demo customer we seeded previously
  await prisma.user.delete({ where: { email: 'customer@kritimarketplace.com' } }).catch(() => {});

  if (isDemoMode) {
    // Create Default Customer User for Demo
    const customerEmail = 'customer@kritimarketplace.com';
    const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    let customerUser = existingCustomer;

    if (!existingCustomer) {
      let demoHashedPassword = '';
      if (typeof hashedPassword !== 'undefined') {
        demoHashedPassword = hashedPassword;
      } else {
        const salt = await bcrypt.genSalt(10);
        demoHashedPassword = await bcrypt.hash('customer123', salt);
      }

      customerUser = await prisma.user.create({
        data: {
          email: customerEmail,
          password: demoHashedPassword,
          name: 'Rahul Sharma',
          role: 'customer',
          phone: '8807264646'
        }
      });
      console.log('✔ Default customer account generated.');
    }

    // 2. Create Cleaner Marketplace Categories
    const categories = [
      { name: 'Kitchen & Dining', slug: 'kitchen-dining', description: 'Premium copperware, brass cooksets, and wood organizers', image: '/images/category_kitchen.jpg' },
      { name: 'Cleaning Essentials', slug: 'cleaning-essentials', description: 'Microfiber towels, multi-purpose sprays, and floor cleaners', image: '/images/category_cleaning.jpg' },
      { name: 'Garden & Outdoor', slug: 'garden-outdoor', description: 'Pruning shears, natural planters, and garden tools', image: '/images/category_garden.jpg' },
      { name: 'Automotive Accessories', slug: 'automotive-accessories', description: 'Premium helmets, detailing kits, and interior perfume', image: '/images/category_automotive.jpg' },
      { name: 'Health & Personal Care', slug: 'health-personal-care', description: 'Organic kumkumadi oil, natural neem combs, and wellness products', image: '/images/category_health.jpg' }
    ];

    const categoryMap = {};
    for (const cat of categories) {
      const createdCat = await prisma.category.create({
        data: cat
      });
      categoryMap[cat.name] = createdCat.id;
      console.log(`✔ Category created: ${cat.name}`);
    }

    // 3. Create Default Products spanning all categories
    const products = [
      {
        id: 'prod-1',
        name: 'Pure Brass Filter Coffee Set',
        tagline: 'Kumbakonam Traditional Brassware',
        description: 'Includes a heavy brass tumbler and davara to enjoy authentic South Indian filter coffee.',
        price: 1899,
        originalPrice: 2499,
        codPrice: 1899,
        onlinePrice: 1799,
        onlineDiscount: 100,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Kitchen & Dining'],
        stock: 15,
        seller: 'Kumbakonam Brassworks',
        images: JSON.stringify(['/images/coffee_maker_1.jpg', '/images/coffee_maker_2.jpg']),
        highlights: JSON.stringify([
          "100% Food-Safe Heavy-Gauge Pure Brass",
          "Traditional 2-cup slow percolation filter chamber",
          "Includes 2 authentic Davara serving cups",
          "Airtight fit to preserve the rich coffee aroma"
        ]),
        specifications: JSON.stringify({
          "Material": "Pure Food-Grade Brass (Grade-A)",
          "Capacity": "220ml (Ideal for 2 to 3 cups)",
          "Weight": "480 grams (Heavy gauge)",
          "Included in Box": "1 Percolator Chamber, 1 Press Plunger, 1 Lid, 2 Davara Cups"
        }),
        variants: JSON.stringify({
          "sizes": ["Standard 2-Cup", "Family 4-Cup (+ ₹600)"],
          "colors": ["Polished Gold Brass", "Antique Matte Brass (+ ₹150)"]
        }),
        relatedProducts: JSON.stringify(['prod-3'])
      },
      {
        id: 'prod-2',
        name: 'Organic Kumkumadi Skincare Set',
        tagline: 'Saffron & Goat Milk Wellness',
        description: 'Authentic Ayurvedic recipe with pure saffron extracts for glowing and radiant skin.',
        price: 2450,
        originalPrice: 2990,
        codPrice: 2450,
        onlinePrice: 2350,
        onlineDiscount: 100,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Health & Personal Care'],
        stock: 8,
        images: JSON.stringify(['/images/ayurvedic_1.jpg', '/images/ayurvedic_2.jpg']),
        seller: 'Sadhyo Wellness Labs',
        highlights: JSON.stringify([
          "100% Natural, Cruelty-Free, and Mineral-Oil-Free",
          "Infused with Grade-A Kashmiri Saffron (Kesar)",
          "Traditional Kerala Ayurvedic preparation"
        ]),
        specifications: JSON.stringify({
          "Key Ingredients": "Kashmiri Mogra Saffron, Goat's Milk, Sandalwood",
          "Skin Type": "Suitable for all skin types",
          "Shelf Life": "24 months from manufacturing"
        }),
        variants: JSON.stringify({
          "sizes": ["Standard Duo Set", "Travel Size (₹1299)"]
        }),
        relatedProducts: JSON.stringify(['prod-4'])
      },
      {
        id: 'prod-3',
        name: 'Hand-Carved Sheesham Wood Spice Box',
        tagline: 'Traditional Indian Masala Dabba',
        description: 'Carved from premium sheesham wood with 7 modular containers and brass latch closures.',
        price: 1599,
        originalPrice: 1999,
        codPrice: 1599,
        onlinePrice: 1499,
        onlineDiscount: 100,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Kitchen & Dining'],
        stock: 22,
        seller: 'Saharanpur Woodcrafts Coop',
        images: JSON.stringify(['/images/spice_box_1.jpg', '/images/spice_box_2.jpg']),
        highlights: JSON.stringify([
          "Seasoned Sheesham Wood with rich natural grain",
          "9 separate spice compartments with a mini wooden spoon",
          "Sturdy brass latch closure & premium glass top window"
        ]),
        specifications: JSON.stringify({
          "Material": "Sheesham Wood (Rosewood) and Brass",
          "Dimensions": "8 x 8 x 3 inches",
          "Weight": "650 grams"
        }),
        variants: JSON.stringify({
          "sizes": ["9 Compartments (Standard)", "12 Compartments (+ ₹400)"],
          "colors": ["Natural Walnut finish", "Dark Espresso finish"]
        }),
        relatedProducts: JSON.stringify(['prod-1'])
      },
      {
        id: 'prod-4',
        name: 'Premium Neem Wood Comb & Grooming Set',
        tagline: 'Natural Anti-Dandruff Therapy',
        description: 'Handcrafted from young neem wood. Stimulates scalp circulation, prevents dandruff, and promotes hair health.',
        price: 499,
        originalPrice: 799,
        codPrice: 499,
        onlinePrice: 449,
        onlineDiscount: 50,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Health & Personal Care'],
        stock: 35,
        seller: 'Sadhyo Wellness Labs',
        images: JSON.stringify(['/images/ayurvedic_1.jpg']),
        highlights: JSON.stringify([
          "100% Herbal Neem wood",
          "Anti-static teeth layout",
          "Includes wide tooth and fine tooth comb set"
        ]),
        specifications: JSON.stringify({
          "Material": "Herbal Neem Wood",
          "Pieces in Set": "2 combs",
          "Origin": "Jaipur, Rajasthan"
        }),
        variants: JSON.stringify({
          "sizes": ["Standard Duo Pack"]
        }),
        relatedProducts: JSON.stringify(['prod-2'])
      },
      {
        id: 'prod-5',
        name: 'Premium Microfiber Towel & Cleaning Spray Kit',
        tagline: 'Scratch-Free Multipurpose Shine',
        description: 'Ultra-absorbent lint-free microfiber towels paired with eco-friendly cleaning liquid. Ideal for glass, kitchens, and appliances.',
        price: 699,
        originalPrice: 999,
        codPrice: 699,
        onlinePrice: 649,
        onlineDiscount: 50,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Cleaning Essentials'],
        stock: 40,
        seller: 'Safai Cleaners Ltd',
        images: JSON.stringify(['/images/ayurvedic_2.jpg']),
        highlights: JSON.stringify([
          "800 GSM Ultra-thick microfiber towels",
          "Organic citrus-extract based cleaning spray",
          "Streak-free cleaning for multiple surfaces"
        ]),
        specifications: JSON.stringify({
          "Towel Size": "40x40 cm",
          "Spray Volume": "500 ml",
          "GSM Rating": "800 GSM"
        }),
        variants: JSON.stringify({
          "sizes": ["Towel + 500ml Spray Pack", "Dual Towel + Spray Pack (+ ₹250)"]
        }),
        relatedProducts: JSON.stringify([])
      },
      {
        id: 'prod-6',
        name: 'Ergonomic Bypass Hand Pruner Shears',
        tagline: 'Professional Garden Cutting Tool',
        description: 'Razor-sharp carbon steel blades with spring-assisted handles for effortless gardening pruning and shaping.',
        price: 899,
        originalPrice: 1399,
        codPrice: 899,
        onlinePrice: 799,
        onlineDiscount: 100,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Garden & Outdoor'],
        stock: 18,
        seller: 'Greenscapes Agri Co.',
        images: JSON.stringify(['/images/spice_box_2.jpg']),
        highlights: JSON.stringify([
          "SK5 High-carbon steel blades",
          "Non-slip ergonomic cushion handles",
          "Secure safety lock for child protection"
        ]),
        specifications: JSON.stringify({
          "Blade Material": "SK5 High Carbon Steel",
          "Overall Length": "8.5 inches",
          "Cutting Capacity": "Up to 20mm branch diameter"
        }),
        variants: JSON.stringify({
          "colors": ["Garden Green", "Safety Orange"]
        }),
        relatedProducts: JSON.stringify([])
      },
      {
        id: 'prod-7',
        name: 'Premium Car Detailing & Perfume Combo',
        tagline: 'Indian Spice Car Cologne & Cleaner',
        description: 'Keeps your car interior smelling premium with traditional sandalwood-spiced fragrance, combined with microfiber wash wipes.',
        price: 1199,
        originalPrice: 1799,
        codPrice: 1199,
        onlinePrice: 1099,
        onlineDiscount: 100,
        enableOnlineDiscount: true,
        codAvailable: true,
        categoryId: categoryMap['Automotive Accessories'],
        stock: 25,
        seller: 'Vahan Detailing Guild',
        images: JSON.stringify(['/images/coffee_maker_2.jpg']),
        highlights: JSON.stringify([
          "Premium gel-based sandalwood car perfume (lasts 60 days)",
          "Pack of 4 interior microfiber towels",
          "Safe for leather and vinyl dashboards"
        ]),
        specifications: JSON.stringify({
          "Perfume Weight": "80g",
          "Fragrance Type": "Royal Sandalwood & Cardamom",
          "Towel Count": "4 Pieces"
        }),
        variants: JSON.stringify({
          "colors": ["Royal Sandalwood", "Mystic Musk"]
        }),
        relatedProducts: JSON.stringify([])
      }
    ];

    for (const prod of products) {
      const randomPurchaseCount = Math.floor(Math.random() * (205 - 60 + 1)) + 60;
      prod.purchaseCount = randomPurchaseCount;
      prod.showPurchaseCount = true;
      prod.purchaseCountMode = "auto";
      
      await prisma.product.create({ data: prod });
      console.log(`✔ Product created: ${prod.name}`);
    }

    // 4. Create seed delivered order
    const orderId = 'ODR-123456';
    await prisma.order.create({
      data: {
        orderId,
        userId: customerUser.id,
        amount: 1899,
        status: 'delivered',
        paymentMethod: 'COD',
        paymentStatus: 'paid',
        pincode: '560001',
        discountAmount: 0,
        orderItems: {
          create: [
            {
              productId: 'prod-1',
              quantity: 1,
              price: 1899
            }
          ]
        }
      }
    });
    console.log(`✔ Delivered test order ${orderId} created.`);

    // 5. Populate reviews
    const customerNames = ["Rahul Sharma", "Nithin P.", "Priya Verma", "Ashraf K.", "Sneha R.", "Vishnu", "Aditya Singh", "Fasil", "Maria Joseph", "Rohit Kumar"];
    const reviewsPool = [
      { title: "Very useful product", text: "Very useful product. Packing was neat and delivery was quick." },
      { title: "Good purchase", text: "Quality is good. Fits well in our home." },
      { title: "Nice quality", text: "Nice quality. Family liked it. Will definitely buy again." },
      { title: "Value for money", text: "Super product. Value for money. Recommended." }
    ];

    for (const prod of products) {
      const reviewCount = 5;
      let totalRating = 0;
      for (let i = 0; i < reviewCount; i++) {
        const template = reviewsPool[i % reviewsPool.length];
        const reviewer = customerNames[Math.floor(Math.random() * customerNames.length)];
        const rating = Math.random() < 0.7 ? 5 : 4;
        totalRating += rating;

        await prisma.review.create({
          data: {
            productId: prod.id,
            userId: customerUser.id,
            rating: rating,
            comment: template.text,
            customerName: reviewer,
            orderId: `ODR-MOCK-${Math.floor(Math.random()*100000)}`,
            title: template.title,
            status: 'approved',
            purchaseMonth: 'July 2026',
            createdAt: new Date(Date.now() - (Math.random() * 10 * 24 * 60 * 60 * 1000))
          }
        });
      }
      const avgRating = totalRating / reviewCount;
      await prisma.product.update({
        where: { id: prod.id },
        data: { 
          reviewCount: reviewCount,
          rating: Number(avgRating.toFixed(1)),
          averageRating: Number(avgRating.toFixed(1))
        }
      });
      console.log(`✔ Generated ${reviewCount} reviews for ${prod.name}`);
    }
  }

  // 6. Seed Default StoreSettings
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {
      storeName: 'RK Peedika',
      storeLogo: '/images/logo.jpg',
      storeEmail: 'rikkas.aboo@gmail.com',
      supportEmail: 'rikkas.aboo@gmail.com',
      supportPhone: '+91 9188072646',
      whatsappNumber: '+91 9188072646',
      footerContent: 'Discover useful everyday products, trending gadgets, fashion, home essentials and more at affordable prices with secure shopping and Cash on Delivery.',
      announcementBar: '✨ Special Savings on Online Payments | Use Code: RIKKAS',
      businessName: 'RK Peedika',
      businessAddress: 'Kasaragod, Kerala, India - 671320'
    },
    create: {
      id: 'default',
      storeName: 'RK Peedika',
      storeLogo: '/images/logo.jpg',
      storeEmail: 'rikkas.aboo@gmail.com',
      supportEmail: 'rikkas.aboo@gmail.com',
      supportPhone: '+91 9188072646',
      whatsappNumber: '+91 9188072646',
      footerContent: 'Discover useful everyday products, trending gadgets, fashion, home essentials and more at affordable prices with secure shopping and Cash on Delivery.',
      announcementBar: '✨ Special Savings on Online Payments | Use Code: RIKKAS',
      businessName: 'RK Peedika',
      businessAddress: 'Kasaragod, Kerala, India - 671320'
    }
  });

  // 7. Seed Badges (Dynamic list from DB)
  await prisma.trustBadge.deleteMany({});
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
  console.log('✔ Trust badges seeded.');

  // 8. Seed Razorpay payment gateway configuration
  await prisma.paymentGatewayConfig.upsert({
    where: { gatewayName: 'razorpay' },
    update: {
      displayName: 'Razorpay',
      isEnabled: true,
      environment: 'sandbox',
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || ''
    },
    create: {
      gatewayName: 'razorpay',
      displayName: 'Razorpay',
      isEnabled: true,
      environment: 'sandbox',
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || ''
    }
  });
  console.log('✔ Razorpay payment gateway config upserted.');

  console.log('🌲 Seeding operations completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
