import { Router, Request, Response } from 'express';
import { cpfpService } from '../../services/feebump/cpfp';
import { lightningPaymentService } from '../../services/lightning/payment';
import { bitcoinService } from '../../services/bitcoin/node';
import { logger } from '../../utils/logger';

const router = Router();


// Broadcast CPFP transaction 
// POST /api/v1/feebump/broadcast
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { txid, anchorVout, targetFeeRate, paymentHash } = req.body;

    // Validate input
    if (!txid || anchorVout === undefined || !targetFeeRate || !paymentHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: txid, anchorVout, targetFeeRate, paymentHash',
      });
    }

    logger.info('Broadcast requested', {
      txid,
      anchorVout,
      targetFeeRate,
      paymentHash,
    });

    // Step 1: Verify payment has been received
    logger.info('Verifying payment...', { paymentHash });

    const paymentStatus = await lightningPaymentService.checkPaymentStatus(paymentHash);

    if (!paymentStatus.settled) {
      logger.warn('Payment not settled', { paymentHash });
      return res.status(402).json({
        success: false,
        error: 'Payment not received',
        paymentRequired: true,
        paymentHash,
      });
    }

    logger.info('Payment verified!', {
      paymentHash,
      settledAt: paymentStatus.settledAt,
      amountPaid: paymentStatus.amountPaidSats,
    });

    // Step 2: Create CPFP transaction
    logger.info('Creating CPFP transaction...');

    const cpfpResult = await cpfpService.createCPFPTransaction({
      parentTxid: txid,
      anchorVout: parseInt(anchorVout),
      targetFeeRate: parseFloat(targetFeeRate),
    });

    if (!cpfpResult.success) {
      logger.error('CPFP creation failed', { error: cpfpResult.error });
      return res.status(400).json({
        success: false,
        error: cpfpResult.error,
        note: 'Payment was received but CPFP transaction could not be created',
      });
    }

    // Step 3: Broadcast the CPFP transaction
    logger.info('Broadcasting CPFP transaction...', {
      childTxid: cpfpResult.childTxid,
    });

    try {
      const broadcastResult = await bitcoinService.sendRawTransaction(cpfpResult.childTxHex!);

      logger.info('CPFP transaction broadcast successful!', {
        parentTxid: txid,
        childTxid: cpfpResult.childTxid,
        feePaid: cpfpResult.feePaid,
      });

      // TODO: Save to database
      // await database.saveCPFPTransaction({
      //   parentTxid: txid,
      //   cpfpTxid: cpfpResult.childTxid,
      //   paymentHash,
      //   feePaid: cpfpResult.feePaid,
      //   broadcastAt: new Date(),
      // });

      res.json({
        success: true,
        message: 'CPFP transaction broadcast successfully',
        data: {
          parentTxid: txid,
          childTxid: cpfpResult.childTxid,
          feePaid: cpfpResult.feePaid,
          broadcastAt: new Date(),
          paymentHash,
        },
      });

    } catch (broadcastError: any) {
      logger.error('Broadcast failed', {
        error: broadcastError.message,
        childTxHex: cpfpResult.childTxHex,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to broadcast CPFP transaction',
        details: broadcastError.message,
        note: 'Payment was received and transaction was created, but broadcast failed',
      });
    }

  } catch (error: any) {
    logger.error('Error in broadcast endpoint', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process broadcast request',
      details: error.message,
    });
  }
});

export default router;