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

dotenv.config();

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