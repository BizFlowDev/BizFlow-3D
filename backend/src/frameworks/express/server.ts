import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from '../../config/index.js';

// Middlewares
import { errorHandler } from '../../adapters/middleware/errorHandler.js';
import { requestLogger } from '../../adapters/middleware/requestLogger.js';

// DI Container (for auditLogRepo)
import { controllers } from '../../config/diContainer.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import debtRoutes from './routes/debtRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
// import aiOrderRoutes from './routes/aiOrderRoutes.js';
import accountingRoutes from './routes/accountingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export function createServer(): Express {
  const app = express();

  // 1. Security and standard middlewares
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  // 2. Request logging
  app.use(requestLogger(controllers.auditLogRepo));

  // 3. API Routes
  const apiRouter = express.Router();

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/products', productRoutes);
  apiRouter.use('/customers', customerRoutes);
  apiRouter.use('/orders', orderRoutes);
  apiRouter.use('/inventory', inventoryRoutes);
  apiRouter.use('/debts', debtRoutes);
  apiRouter.use('/reports', reportRoutes);
  // apiRouter.use('/ai-orders', aiOrderRoutes);
  apiRouter.use('/accounting', accountingRoutes);
  apiRouter.use('/admin', adminRoutes);

  app.use('/api/v1', apiRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'BizFlow-3D API is running' });
  });

  // 4. Global Error Handler (must be last)
  app.use(errorHandler);

  return app;
}
