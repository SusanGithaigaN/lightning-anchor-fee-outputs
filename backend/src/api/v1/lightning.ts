import { Router, Request, Response } from 'express';
import { lightningService } from '../../services/lightning/lnd';
import { logger } from '../../utils/logger';

const router = Router();

// Check whether LND is ready for invoice creation
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    const info = await lightningService.getInfo();
    const syncedToChain = Boolean(info?.synced_to_chain);

    res.json({
      success: true,
      data: {
        readyForInvoices: syncedToChain,
        syncedToChain,
        blockHeight: info?.block_height,
        alias: info?.alias,
        identityPubkey: info?.identity_pubkey,
        network: info?.chains?.[0]?.network,
      },
    });
  } catch (error: any) {
    logger.warn('LND readiness check failed', { error: error.message });
    res.json({
      success: true,
      data: {
        readyForInvoices: false,
        syncedToChain: false,
        reason: error.message,
      },
    });
  }
});

// Get LND node info
router.get('/info', async (req: Request, res: Response) => {
  try {
    const info = await lightningService.getInfo();
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
    const balance = await lightningService.getBalance();
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
    const channels = await lightningService.listChannels();
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
