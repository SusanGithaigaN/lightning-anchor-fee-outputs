import { Router, Request, Response } from 'express';
import { lightningPaymentService } from '../../services/lightning/payment';
import { logger } from '../../utils/logger';

const router = Router();

//  POST /api/v1/lightning/create-invoice
router.post('/create-invoice', async (req: Request, res: Response) => {
    try {
        const { amountSats, memo, expiry } = req.body;

        if (!amountSats) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: amountSats',
            });
        }

        if (amountSats < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least 1 satoshi',
            });
        }

        logger.info('Invoice creation requested', {
            amountSats,
            memo: memo || 'Fee bump service',
        });

        const invoice = await lightningPaymentService.createInvoice({
            amountSats: parseInt(amountSats),
            memo: memo || 'Lightning Network Fee Bump Service',
            expiry: expiry ? parseInt(expiry) : 3600,
        });

        res.json({
            success: true,
            data: {
                paymentHash: invoice.paymentHash,
                invoice: invoice.paymentRequest,
                amountSats: invoice.amountSats,
                expiresAt: invoice.expiresAt,
            },
        });
    } catch (error: any) {
        logger.error('Error creating invoice', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to create invoice',
            details: error.message,
        });
    }
});


// GET /api/v1/lightning/payment/:paymentHash

router.get('/payment/:paymentHash', async (req: Request, res: Response) => {
    try {
        const paymentHash = req.params.paymentHash as string;

        if (!paymentHash || paymentHash.length !== 64) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment hash (must be 64 character hex string)',
            });
        }

        logger.debug('Payment status check', { paymentHash });

        const status = await lightningPaymentService.checkPaymentStatus(paymentHash);

        res.json({
            success: true,
            data: {
                paymentHash: status.paymentHash,
                paid: status.settled,
                settledAt: status.settledAt,
                amountPaidSats: status.amountPaidSats,
            },
        });
    } catch (error: any) {
        logger.error('Error checking payment status', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to check payment status',
            details: error.message,
        });
    }
});

// POST /api/v1/lightning/decode-invoice
router.post('/decode-invoice', async (req: Request, res: Response) => {
    try {
        const { invoice } = req.body;

        if (!invoice) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: invoice',
            });
        }

        const decoded = await lightningPaymentService.decodeInvoice(invoice);

        res.json({
            success: true,
            data: decoded,
        });
    } catch (error: any) {
        logger.error('Error decoding invoice', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to decode invoice',
            details: error.message,
        });
    }
});

export default router;