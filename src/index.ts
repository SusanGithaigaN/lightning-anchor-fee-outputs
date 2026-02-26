import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { bitcoinService } from './services/bitcoin/node';
import { lndService } from './services/lightning/lnd';
import bitcoinRouter from './api/v1/bitcoin';
import lightningRouter from './api/v1/lightning';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Lightning Anchor Fee Bumping Service',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      bitcoin: '/api/v1/bitcoin',
      lightning: '/api/v1/lightning',
    },
  });
});

// Mount routers
app.use('/api/v1/bitcoin', bitcoinRouter);
app.use('/api/v1/lightning', lightningRouter);

async function initializeServices() {
  logger.info('Initializing services...');
  
  const bitcoinConnected = await bitcoinService.testConnection();
  if (!bitcoinConnected) {
    logger.error('Failed to connect to Bitcoin Core');
    process.exit(1);
  }
  
  const lndConnected = await lndService.testConnection();
  if (!lndConnected) {
    logger.warn('Failed to connect to LND (continuing anyway)');
  }
  
  logger.info('All services initialized');
}

app.listen(port, async () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${port}/health`);
  await initializeServices();
});

export default app;
