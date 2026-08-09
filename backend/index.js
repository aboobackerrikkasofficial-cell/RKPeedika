import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

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

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

/**
 * Upload directory.
 */
const uploadDirectory = path.resolve(
  process.cwd(),
  'src',
  'uploads'
);

const importedDirectory = path.join(
  uploadDirectory,
  'imported'
);

fs.mkdirSync(importedDirectory, {
  recursive: true,
});

/**
 * Security.
 */
app.use(
  helmet({
    contentSecurityPolicy: false,

    // Allow customer website on Vercel to load images
    // from the Render backend.
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

/**
 * Logging.
 */
app.use(morgan('dev'));

/**
 * CORS.
 */
const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  : [];

app.use(
  cors({
    origin:
      configuredOrigins.length > 0
        ? configuredOrigins
        : true,
    credentials: true,
  })
);

/**
 * Body parsers.
 */
app.use(
  express.json({
    limit: '50mb',

    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true,
  })
);

/**
 * Static uploaded images.
 *
 * Example:
 *
 * https://rkpeedika.onrender.com/uploads/imported/image.jpg
 */
app.use(
  '/uploads',
  express.static(uploadDirectory, {
    setHeaders: (res) => {
      res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
      );

      res.setHeader(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
      );

      res.setHeader(
        'Cache-Control',
        'public, max-age=86400'
      );
    },
  })
);

/**
 * Health check.
 */
app.get('/', (_req, res) => {
  res.json({
    status: 'Healthy',
    service: 'RK Peedika Indian Marketplace E-commerce API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Simple upload status endpoint.
 */
app.get('/uploads-status', (_req, res) => {
  res.json({
    success: true,
    uploadDirectory: '/uploads',
    importedDirectory: '/uploads/imported',
    message: 'Upload service is available.',
  });
});

/**
 * Swagger.
 */
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

/**
 * API routes.
 */
app.use('/api/auth', authRoutes);

app.use('/api/products', productRoutes);

app.use('/api/categories', categoryRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/coupons', couponRoutes);

app.use('/api/reviews', reviewRoutes);

app.use('/api/users', userRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/newsletter', newsletterRoutes);

app.use('/api/exchanges', exchangeRoutes);

app.use('/api/badges', badgeRoutes);

app.use('/api/settings', settingRoutes);

app.use('/api/payments', paymentRoutes);

app.use('/api/store', storeRoutes);

app.use('/api/admin/store', storeRoutes);

/**
 * Product image upload.
 */
app.use('/api/uploads', uploadRoutes);

/**
 * 404.
 */
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    error: {
      message:
        `Route endpoint ${req.originalUrl} not found on this server.`,
    },
  });
});

/**
 * Global error handler.
 */
app.use(errorHandler);

/**
 * Start server.
 */
app.listen(PORT, () => {
  logger.info(
    `🚀 Scalable E-commerce API running on port ${PORT}`
  );

  logger.info(
    `📖 Swagger documentation UI: http://localhost:${PORT}/api-docs`
  );

  logger.info(
    `📁 Product uploads: ${importedDirectory}`
  );
});