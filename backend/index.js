import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

// Load configurations & utils
import logger from './src/utils/logger.js';
import errorHandler from './src/middleware/errorHandler.js';
import swaggerSpec from './src/config/swagger.js';

// Load routes modules
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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow swagger assets to load cleanly
}));
app.use(morgan('dev'));
app.use(cors({ origin: '*' }));
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serving uploaded files static directory
app.use('/uploads', express.static('./src/uploads'));

// Disable caching for API routes
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Expires', '-1');
  res.set('Pragma', 'no-cache');
  next();
});

// Health Check Endpoint
app.get('/', (req, res) => {
  res.json({
    status: "Healthy",
    service: "Kriti Indian Marketplace E-commerce API",
    timestamp: new Date().toISOString(),
    sandboxMode: true
  });
});

// Swagger API Documentations UI Endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Bind Modular API Routes
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

// Catch-all 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    error: {
      message: `Route endpoint ${req.originalUrl} not found on this server.`
    }
  });
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

// Launch HTTP Server listening
app.listen(PORT, () => {
  logger.info(`🚀 Scalable E-commerce API running on port ${PORT}`);
  logger.info(`📖 Swagger documentation UI: http://localhost:${PORT}/api-docs`);
});
