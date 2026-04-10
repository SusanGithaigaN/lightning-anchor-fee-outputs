import { Router, Request, Response } from 'express';
import { cpfpService } from '../../services/feebump/cpfp';
// import { anchorMonitor } from '../../services/feebump/monitor';
import { logger } from '../../utils/logger';

const router = Router();

// Estimate fee bump costs
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { txid, anchorVout, targetFeeRate } = req.body;
    const parsedTargetFeeRate = parseFloat(String(targetFeeRate));
    const parsedAnchorVout = anchorVout === undefined || anchorVout === null || anchorVout === ''
      ? undefined
      : parseInt(String(anchorVout), 10);

    if (!txid || Number.isNaN(parsedTargetFeeRate)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required fields: txid, targetFeeRate',
      });
    }

    if (parsedAnchorVout !== undefined && (Number.isNaN(parsedAnchorVout) || parsedAnchorVout < 0)) {
      return res.status(400).json({
        success: false,
        error: 'anchorVout must be a non-negative integer',
      });
    }

    logger.info('Estimating fee bump', {
      txid,
      anchorVout: parsedAnchorVout,
      targetFeeRate: parsedTargetFeeRate,
    });

    const estimate = await cpfpService.estimateFeeBump({
      parentTxid: txid,
      anchorVout: parsedAnchorVout,
      targetFeeRate: parsedTargetFeeRate,
    });

    res.json({
      success: true,
      data: estimate,
    });

  } catch (error: any) {
    logger.error('Error estimating fee bump', { error: error.message });
    const isUserInputIssue = /anchor output|330-sat anchor|transaction outputs/i.test(error.message);
    res.status(isUserInputIssue ? 400 : 500).json({
      success: false,
      error: isUserInputIssue ? 'Invalid transaction or anchor selection' : 'Failed to estimate fee bump',
      details: error.message,
    });
  }
});

// Create CPFP transaction without broadcasting
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { txid, anchorVout, targetFeeRate } = req.body;

    if (!txid || anchorVout === undefined || !targetFeeRate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: txid, anchorVout, targetFeeRate',
      });
    }

    logger.info('Creating CPFP transaction', {
      txid,
      anchorVout,
      targetFeeRate,
    });

    const result = await cpfpService.createCPFPTransaction({
      parentTxid: txid,
      anchorVout: parseInt(anchorVout),
      targetFeeRate: parseFloat(targetFeeRate),
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'CPFP transaction created',
        data: {
          childTxid: result.childTxid,
          childTxHex: result.childTxHex,
          feePaid: result.feePaid,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    logger.error('Error creating CPFP transaction', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create CPFP transaction',
      details: error.message,
    });
  }
});

// Request a fee bump 
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { txid, anchorVout, targetFeeRate } = req.body;

    if (!txid || anchorVout === undefined || !targetFeeRate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: txid, anchorVout, targetFeeRate',
      });
    }

    logger.info('Fee bump requested', {
      txid,
      anchorVout,
      targetFeeRate,
    });

    const result = await cpfpService.createCPFPTransaction({
      parentTxid: txid,
      anchorVout: parseInt(anchorVout),
      targetFeeRate: parseFloat(targetFeeRate),
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'CPFP transaction created',
        data: {
          childTxid: result.childTxid,
          feePaid: result.feePaid,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    logger.error('Error processing fee bump request', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to process fee bump request',
      details: error.message,
    });
  }
});

export default router;