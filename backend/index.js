import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

import logger from './src/utils/logger.js';
import errorHandler from './src/middleware/errorHandler.js';
import swaggerSpec from './src/config/swagger.js';

import authRoutes from './src/routes/auth.routes.js';
import productRoutes from './src/routes/product.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import couponRoutes from './src/routes/coupon.routes.js';
import reviewRoutes from './src/routes/review.routes.js';
import userRoutes from './src/routes/user.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import newsletterRoutes from './src/routes/newsletter.routes.js';
import exchangeRoutes from './src/routes/exchange.routes.js';
import badgeRoutes from './src/routes/badge.routes.js';
import settingRoutes from './src/routes/setting.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import storeRoutes from './src/routes/store.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';

// Environment variables are loaded on line 1 via env.js

/*
|--------------------------------------------------------------------------
| Application
|--------------------------------------------------------------------------
*/

const app = express();

const PORT =
  Number(process.env.PORT) || 5000;

/*
|--------------------------------------------------------------------------
| Resolve paths correctly on Render
|--------------------------------------------------------------------------
*/

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const uploadsPath =
  path.join(
    __dirname,
    'src',
    'uploads'
  );

/*
|--------------------------------------------------------------------------
| Allowed Frontend Origins
|--------------------------------------------------------------------------
*/

const defaultOrigins = [
  'https://rk-peedika.vercel.app',
  'https://rkpeedika.vercel.app',
  'https://rk-peedika-admin.vercel.app'
];

const configuredOrigins =
  process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL
      .split(',')
      .map((origin) =>
        origin.trim()
      )
      .filter(Boolean)
    : [];

const allowedOrigins = [
  ...new Set([
    ...defaultOrigins,
    ...configuredOrigins,
  ]),
];

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    contentSecurityPolicy: false,

    /*
     * IMPORTANT:
     *
     * Allows Vercel frontend to load images
     * from the Render backend.
     */
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin(origin, callback) {
      /*
       * Allow server-to-server requests,
       * Postman, browser direct requests, etc.
       */
      if (!origin) {
        return callback(null, true);
      }

      /*
       * Development / wildcard mode
       */
      if (
        process.env.FRONTEND_URL === '*'
      ) {
        return callback(null, true);
      }

      /*
       * Allow localhost in development
       */
      if (
        origin.startsWith('http://localhost:') ||
        origin === 'http://localhost' ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === 'http://127.0.0.1'
      ) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      logger.warn(
        `CORS blocked origin: ${origin}`
      );

      return callback(
        new Error(
          `CORS policy blocked origin: ${origin}`
        )
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  })
);

/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/

app.use(morgan('dev'));

/*
|--------------------------------------------------------------------------
| Request body
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '50mb',

    verify: (
      req,
      res,
      buffer
    ) => {
      req.rawBody =
        buffer.toString();
    },
  })
);

app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true,
  })
);

/*
|--------------------------------------------------------------------------
| Uploaded Images
|--------------------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * Customer frontend:
 *
 * https://rk-peedika.vercel.app
 *
 * Backend:
 *
 * https://rkpeedika.onrender.com
 *
 * Images:
 *
 * https://rkpeedika.onrender.com/uploads/imported/xxx.jpg
 *
 */

app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader(
      'Cross-Origin-Resource-Policy',
      'cross-origin'
    );

    res.setHeader(
      'Access-Control-Allow-Origin',
      '*'
    );

    res.setHeader(
      'Cache-Control',
      'public, max-age=86400'
    );

    next();
  },
  express.static(
    uploadsPath,
    {
      fallthrough: false,
      etag: true,
      maxAge: '1d',
    }
  )
);

/*
|--------------------------------------------------------------------------
| Upload status
|--------------------------------------------------------------------------
*/

app.get(
  '/uploads-status',
  (req, res) => {
    res.json({
      success: true,
      uploadsPath,
      message:
        'Upload service is available.',
      imageBaseUrl:
        `${req.protocol}://${req.get('host')}/uploads`,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.json({
    status: 'Healthy',
    service:
      'RK Peedika Indian Marketplace E-commerce API',
    timestamp:
      new Date().toISOString(),
  });
});

app.get(
  '/health',
  (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
|--------------------------------------------------------------------------
| Swagger
|--------------------------------------------------------------------------
*/

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(
    swaggerSpec
  )
);

/*
|--------------------------------------------------------------------------
| Temporary Route for Seeding Reviews on Live Database
|--------------------------------------------------------------------------
*/
import { PrismaClient } from '@prisma/client';
const prismaDb = new PrismaClient();

app.get('/api/seed-all-reviews', async (req, res) => {
  try {
    const customerNames = [
      "Rahul Sharma", "Nithin P.", "Priya Verma", "Ashraf K.", "Sneha R.", "Vishnu", "Aditya Singh", "Fasil", "Maria Joseph", "Rohit Kumar",
      "Kavya", "Arjun", "Lakshmi", "Vignesh", "Ramesh", "Deepa", "Anjali", "Suresh", "Ganesh", "Swati",
      "Kiran", "Divya", "Pooja", "Manoj", "Ajay", "Meera", "Akhil", "Harish", "Navya", "Sandeep"
    ];

    const reviewsPool = [
      { title: "Bahut badhiya", text: "प्रोडक्ट काफी अच्छा है, और क्वालिटी भी बढ़िया है। डिलीवरी टाइम पर हो गई।" },
      { title: "Paisa vasool", text: "मुझे यह बहुत पसंद आया। जो फोटो में दिखाया था बिल्कुल वैसा ही मिला है। एकदम पैसा वसूल।" },
      { title: "Achha hai", text: "काफी यूजफुल है और पैकेजिंग भी बहुत अच्छी थी। मैं इसे जरूर रेकमेंड करूंगा।" },
      { title: "Super product", text: "क्वालिटी बहुत ही बढ़िया है। इस्तेमाल करने में भी आसान है।" },
      { title: "Must buy", text: "Product bahut badhiya hai, delivery bhi fast thi. Definitely a must buy!" },
      { title: "Good quality", text: "Quality ekdum mast hai. Ghar pe sabko pasand aaya. Worth the price." },
      { title: "Nice packaging", text: "Packing bahut neat thi aur koi damage nahi tha. Bohot badiya experience." },
      { title: "Awesome", text: "Bhai kya sahi cheez hai! Price ke hisaab se bahut accha deal mila." },
      { title: "Good one", text: "Maine expect nahi kiya tha itna accha hoga, but sach me good quality hai." },
      { title: "Adipoli", text: "വളരെ നല്ല പ്രൊഡക്റ്റ് ആണ്. എനിക്ക് ഒരുപാട് ഇഷ്ടപ്പെട്ടു." },
      { title: "Nalla quality", text: "നല്ല ക്വാളിറ്റി ഉണ്ട്. പാക്കിങ് ഒക്കെ സൂപ്പർ ആയിരുന്നു." },
      { title: "Worth it", text: "കൊടുത്ത പൈസക്ക് മുതലാണ്. ധൈര്യമായിട്ട് വാങ്ങാം." },
      { title: "Superb", text: "വീട്ടിൽ എല്ലാവർക്കും ഇഷ്ടായി. ഡെലിവറി വേഗം തന്നെ കിട്ടി." },
      { title: "Kidilan item", text: "Nalla quality und. Package um adipoli ayirunnu. Worth the money." },
      { title: "Super", text: "Ithu valare nalla oru product aanu. Use cheyyan nalla eluppam und." },
      { title: "Pwoli", text: "Enikku ishtapettu. Nalla standard aayittulla item aanu. Price um affordable aanu." },
      { title: "Good", text: "Kuzhappam illa, nalla sadhanam aanu. Delivery fast aayirunnu." },
      { title: "Adipoli", text: "Kidilan product. Pysakku muthalanu, doubt illathe vangaam." },
      { title: "Super", text: "ரொம்ப நல்லா இருக்கு. கண்டிப்பா வாங்கலாம்." },
      { title: "Nalla quality", text: "பொருளின் தரம் மிக அருமை. பேக்கிங் சூப்பர்." },
      { title: "Worth money", text: "காசுக்கு ஏற்ற பொருள். நான் ரொம்ப திருப்தி அடைந்தேன்." },
      { title: "Arumai", text: "வீட்டுக்கு ரொம்ப யூஸ்ஃபுல்லா இருக்கு. நல்லா உழைக்கும்னு நம்புறேன்." },
      { title: "Super product", text: "Romba nalla irukku. Quality pakka. Worth buying." },
      { title: "Nice", text: "Packing nalla irundhuchu. Delivery um speed dhan. Thank you." },
      { title: "Channagide", text: "ಉತ್ತಮ ಗುಣಮಟ್ಟದ ಉತ್ಪನ್ನ. ಪ್ಯಾಕಿಂಗ್ ಚೆನ್ನಾಗಿತ್ತು." },
      { title: "Super quality", text: "ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ, ನಾವು ನಿರೀಕ್ಷಿಸಿದಂತೆಯೇ ಇದೆ. ಹಣಕ್ಕೆ ತಕ್ಕ ಮೌಲ್ಯ." },
      { title: "Olle product", text: "ನನಗೆ ಇದು ತುಂಬಾ ಇಷ್ಟವಾಯಿತು. ಎಲ್ಲರೂ ಖರೀದಿಸಬಹುದು." },
      { title: "Sakkath", text: "Thumbaa chennagide. Quality is really good. Packaging kooda mast ittu." },
      { title: "Good purchase", text: "Olle product. Use madakke easy ide. Fast delivery." },
      { title: "Very useful", text: "Very useful product. Packing was neat and delivery was quick." },
      { title: "Good purchase", text: "Quality is good. Fits well in our home. Genuine product." },
      { title: "Nice quality", text: "Nice quality. Family liked it. Will definitely buy again." },
      { title: "Value for money", text: "Super product. Value for money. Recommended." },
      { title: "Happy with it", text: "Got it yesterday and it works great. Happy with the purchase." },
      { title: "Decent product", text: "Decent quality for this price range. Satisfied." }
    ];

    let customerUser = await prismaDb.user.findFirst({ where: { role: 'customer' } });
    if (!customerUser) {
      customerUser = await prismaDb.user.create({
        data: { email: 'dummy_customer_reviews@kritimarketplace.com', name: 'Guest Reviewer', role: 'customer' }
      });
    }

    const products = await prismaDb.product.findMany();
    let logs = [];

    for (const prod of products) {
      await prismaDb.review.deleteMany({ where: { productId: prod.id } });

      const targetReviewCount = Math.floor(Math.random() * (85 - 20 + 1)) + 20; 
      const manualBalance = Math.floor(Math.random() * 2) + 5; 
      const generatedReviewCount = targetReviewCount - manualBalance;

      let totalRating = 0;
      const reviewData = [];

      for (let i = 0; i < generatedReviewCount; i++) {
        const template = reviewsPool[Math.floor(Math.random() * reviewsPool.length)];
        const reviewer = customerNames[Math.floor(Math.random() * customerNames.length)];
        const rand = Math.random();
        const rating = rand < 0.6 ? 5 : (rand < 0.9 ? 4 : 3);
        totalRating += rating;

        reviewData.push({
          productId: prod.id,
          userId: customerUser.id,
          rating: rating,
          comment: template.text,
          customerName: reviewer,
          orderId: `ODR-MOCK-${Math.floor(Math.random()*100000)}`,
          title: template.title,
          status: 'approved',
          purchaseMonth: 'August 2026',
          createdAt: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000))
        });
      }

      await prismaDb.review.createMany({ data: reviewData });

      const avgRating = totalRating / generatedReviewCount;
      await prismaDb.product.update({
        where: { id: prod.id },
        data: { 
          reviewCount: generatedReviewCount,
          rating: Number(avgRating.toFixed(1)),
          averageRating: Number(avgRating.toFixed(1))
        }
      });
      logs.push(`Generated ${generatedReviewCount} automated reviews for product: ${prod.name} (Reserved ${manualBalance} for manual entry)`);
    }

    res.json({ success: true, message: "Reviews successfully seeded across all products", logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/products',
  productRoutes
);

app.use(
  '/api/categories',
  categoryRoutes
);

app.use(
  '/api/orders',
  orderRoutes
);

app.use(
  '/api/coupons',
  couponRoutes
);

app.use(
  '/api/reviews',
  reviewRoutes
);

app.use(
  '/api/users',
  userRoutes
);

app.use(
  '/api/admin',
  adminRoutes
);

app.use(
  '/api/newsletter',
  newsletterRoutes
);

app.use(
  '/api/exchanges',
  exchangeRoutes
);

app.use(
  '/api/badges',
  badgeRoutes
);

app.use(
  '/api/settings',
  settingRoutes
);

app.use(
  '/api/payments',
  paymentRoutes
);

app.use(
  '/api/uploads',
  uploadRoutes
);

app.use(
  '/api/store',
  storeRoutes
);

app.use(
  '/api/admin/store',
  storeRoutes
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      status: 'fail',

      error: {
        message:
          `Route endpoint ${req.originalUrl} not found on this server.`,
      },
    });
  }
);

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    logger.info(
      `🚀 RK Peedika API running on port ${PORT}`
    );

    logger.info(
      `📖 Swagger: http://localhost:${PORT}/api-docs`
    );

    logger.info(
      `🖼️ Upload directory: ${uploadsPath}`
    );

    logger.info(
      `🌐 Allowed origins: ${allowedOrigins.join(', ')}`
    );
  }
);