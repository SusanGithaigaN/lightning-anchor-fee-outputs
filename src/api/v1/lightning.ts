import { Router, Request, Response } from 'express';
import { lndService } from '../../services/lightning/lnd';
import { logger } from '../../utils/logger';

const router = Router();

// Get LND node info
router.get('/info', async (req: Request, res: Response) => {
  try {
    const info = await lndService.getInfo();
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error('Error fetching LND info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LND info',
    });
  }
});

// Get wallet balance
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const balance = await lndService.getWalletBalance();
    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Error fetching balance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
});

// List channels
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const channels = await lndService.listChannels();
    res.json({
      success: true,
      data: channels,
    });
  } catch (error) {
    logger.error('Error listing channels', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list channels',
    });
  }
});

export default router;
