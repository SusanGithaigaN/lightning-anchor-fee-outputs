import { Router, Request, Response } from 'express';
import { bitcoinService } from '../../services/bitcoin/node';
import { logger } from '../../utils/logger';

const router = Router();

// Get blockchain info
router.get('/info', async (req: Request, res: Response) => {
  try {
    const info = await bitcoinService.getBlockchainInfo();
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error('Error fetching blockchain info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blockchain info',
    });
  }
});

// Get mempool info
router.get('/mempool', async (req: Request, res: Response) => {
  try {
    const info = await bitcoinService.getMempoolInfo();
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error('Error fetching mempool info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mempool info',
    });
  }
});

// Get current fee estimate
router.get('/fee-estimate', async (req: Request, res: Response) => {
  try {
    const blocks = parseInt(req.query.blocks as string) || 1;
    const feeRate = await bitcoinService.estimateFee(blocks);
    res.json({
      success: true,
      data: {
        blocks,
        fee_rate_sat_per_vbyte: feeRate,
      },
    });
  } catch (error) {
    logger.error('Error estimating fee', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to estimate fee',
    });
  }
});

// Get transaction details
router.get('/transaction/:txid', async (req: Request, res: Response) => {
  try {
    const txid = req.params.txid as string;  // Fixed: explicit type cast
    const tx = await bitcoinService.getTransaction(txid);
    res.json({
      success: true,
      data: tx,
    });
  } catch (error) {
    logger.error('Error fetching transaction', { error });
    res.status(404).json({
      success: false,
      error: 'Transaction not found',
    });
  }
});

// Get service wallet address for testing
router.get('/wallet-address', async (req: Request, res: Response) => {
  try {
    const { cpfpService } = await import('../../services/feebump/cpfp');
    const address = cpfpService.getWalletAddress();
    res.json({
      success: true,
      data: { address },
    });
  } catch (error) {
    logger.error('Error fetching wallet address', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet address',
    });
  }
});

export default router;
