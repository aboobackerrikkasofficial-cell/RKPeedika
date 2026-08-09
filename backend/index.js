import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------
// Load configurations & utilities
// ---------------------------------------------------------
import logger from './src/utils/logger.js';
import errorHandler from './src/middleware/errorHandler.js';
import swaggerSpec from './src/config/swagger.js';

// ---------------------------------------------------------
// Load routes
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// Environment
// ---------------------------------------------------------
dotenv.config();

// ---------------------------------------------------------
// ES Module directory paths
// ---------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// App
// ---------------------------------------------------------
const app = express();

const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------
// Upload directory
//
// Your project structure is expected to be:
//
// backend/
// ├── index.js
// └── src/
//     └── uploads/
//         └── imported/
//             ├── image1.jpg
//             ├── image2.webp
//             └── ...
// ---------------------------------------------------------
const uploadsDirectory = path.join(
  __dirname,
  'src',
  'uploads'
);

const importedDirectory = path.join(
  uploadsDirectory,
  'imported'
);

// Create directories if they don't exist
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, {
    recursive: true
  });
}

if (!fs.existsSync(importedDirectory)) {
  fs.mkdirSync(importedDirectory, {
    recursive: true
  });
}

// ---------------------------------------------------------
// Basic information
// ---------------------------------------------------------
logger.info(
  `📁 Upload directory: ${uploadsDirectory}`
);

logger.info(
  `📁 Imported images directory: ${importedDirectory}`
);

// ---------------------------------------------------------
// Security middleware
// ---------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// ---------------------------------------------------------
// HTTP request logger
// ---------------------------------------------------------
app.use(morgan('dev'));

// ---------------------------------------------------------
// CORS
// ---------------------------------------------------------
const frontendUrl =
  process.env.FRONTEND_URL || '*';

const allowedOrigins =
  frontendUrl === '*'
    ? '*'
    : frontendUrl
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

// ---------------------------------------------------------
// Body parsers
// ---------------------------------------------------------
app.use(
  express.json({
    limit: '50mb',

    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  })
);

app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true
  })
);

// ---------------------------------------------------------
// STATIC UPLOAD FILES
//
// Browser URL:
//
// https://rkpeedika.onrender.com/uploads/imported/file.jpg
//
// maps to:
//
// backend/src/uploads/imported/file.jpg
// ---------------------------------------------------------
app.use(
  '/uploads',
  express.static(uploadsDirectory, {
    index: false,

    // Allow browser to cache product images.
    maxAge: '7d',

    setHeaders: (res) => {
      res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
      );

      res.setHeader(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
      );
    }
  })
);

// ---------------------------------------------------------
// Upload test endpoint
//
// Open this in browser:
//
// https://rkpeedika.onrender.com/uploads-status
// ---------------------------------------------------------
app.get(
  '/uploads-status',
  (req, res) => {
    let importedFiles = [];

    try {
      importedFiles = fs
        .readdirSync(importedDirectory)
        .slice(0, 20);
    } catch (error) {
      logger.error(
        `Unable to read imported directory: ${error.message}`
      );
    }

    res.json({
      success: true,

      uploadsDirectory,

      importedDirectory,

      importedFiles,

      uploadBaseUrl:
        `${req.protocol}://${req.get('host')}/uploads`
    });
  }
);

// ---------------------------------------------------------
// API cache-control
//
// Don't cache API responses.
// Static images above are handled separately.
// ---------------------------------------------------------
app.use(
  '/api',
  (req, res, next) => {
    res.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );

    res.set(
      'Expires',
      '-1'
    );

    res.set(
      'Pragma',
      'no-cache'
    );

    next();
  }
);

// ---------------------------------------------------------
// Health check
// ---------------------------------------------------------
app.get(
  '/',
  (req, res) => {
    res.json({
      status: 'Healthy',

      service:
        'RK Peedika Indian Marketplace E-commerce API',

      timestamp:
        new Date().toISOString()
    });
  }
);

app.get(
  '/health',
  (req, res) => {
    res.status(200).json({
      status: 'ok',

      timestamp:
        new Date().toISOString()
    });
  }
);

// ---------------------------------------------------------
// Swagger
// ---------------------------------------------------------
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// Authentication
app.use(
  '/api/auth',
  authRoutes
);

// Products
app.use(
  '/api/products',
  productRoutes
);

// Categories
app.use(
  '/api/categories',
  categoryRoutes
);

// Orders
app.use(
  '/api/orders',
  orderRoutes
);

// Coupons
app.use(
  '/api/coupons',
  couponRoutes
);

// Reviews
app.use(
  '/api/reviews',
  reviewRoutes
);

// Users
app.use(
  '/api/users',
  userRoutes
);

// Admin
app.use(
  '/api/admin',
  adminRoutes
);

// Newsletter
app.use(
  '/api/newsletter',
  newsletterRoutes
);

// Exchanges
app.use(
  '/api/exchanges',
  exchangeRoutes
);

// Badges
app.use(
  '/api/badges',
  badgeRoutes
);

// Settings
app.use(
  '/api/settings',
  settingRoutes
);

// Payments
app.use(
  '/api/payments',
  paymentRoutes
);

// Store
app.use(
  '/api/store',
  storeRoutes
);

// Admin Store
app.use(
  '/api/admin/store',
  storeRoutes
);

// ---------------------------------------------------------
// 404 HANDLER
// ---------------------------------------------------------
app.use(
  (req, res, next) => {
    res.status(404).json({
      status: 'fail',

      error: {
        message:
          `Route endpoint ${req.originalUrl} not found on this server.`
      }
    });
  }
);

// ---------------------------------------------------------
// GLOBAL ERROR HANDLER
// ---------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------
// START SERVER
// ---------------------------------------------------------
app.listen(
  PORT,
  () => {
    logger.info(
      `🚀 RK Peedika E-commerce API running on port ${PORT}`
    );

    logger.info(
      `📖 Swagger documentation UI: http://localhost:${PORT}/api-docs`
    );

    logger.info(
      `🖼️ Product images available at: /uploads/`
    );
  }
);