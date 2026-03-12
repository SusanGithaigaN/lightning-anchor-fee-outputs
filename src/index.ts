import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
import express, { Express, Request, Response } from 'express';
import { logger } from './utils/logger';

// Import routes
import bitcoinRoutes from './api/v1/bitcoin';
import lightningRoutes from './api/v1/lightning';
import monitorRoutes from './api/v1/monitor';
import feebumpRoutes from './api/v1/feebump';
import lightningPaymentRoutes from './api/v1/lightning-payment';
import broadcastRoutes from './api/v1/broadcast';

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Lightning Anchor Fee Bumping Service',
    version: '0.1.0',
    status: 'running',
    endpoints: {
      bitcoin: '/api/v1/bitcoin',
      lightning: '/api/v1/lightning',
      monitor: '/api/v1/monitor',
      feebump: '/api/v1/feebump',
    },
  });
});

// API routes
app.use('/api/v1/bitcoin', bitcoinRoutes);
app.use('/api/v1/lightning', lightningRoutes);
app.use('/api/v1/lightning', lightningPaymentRoutes);
app.use('/api/v1/monitor', monitorRoutes);
app.use('/api/v1/feebump', feebumpRoutes);
app.use('/api/v1/feebump', broadcastRoutes);

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${port}/health`);
});

export default app;