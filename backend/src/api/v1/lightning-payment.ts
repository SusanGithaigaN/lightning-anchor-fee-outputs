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

        const isTimeout = /timed out|deadline exceeded/i.test(error.message);

        res.status(isTimeout ? 503 : 500).json({
            success: false,
            error: isTimeout ? 'Lightning node not ready' : 'Failed to create invoice',
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

// Test bypass endpoint .
// THis will mark an invoice as settled without actual payment
// POST /api/v1/lightning/simulate-payment (DEV ONLY)
router.post('/simulate-payment', async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, error: 'Not found' });
    }

    try {
        const { paymentHash } = req.body;

        if (!paymentHash || paymentHash.length !== 64) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment hash (must be 64 character hex string)',
            });
        }

        // Use LND CLI to settle the invoice directly
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        await execAsync(
            `docker compose exec -T lnd lncli --network=regtest settleinvoice ${paymentHash}`
        );

        logger.info('Payment simulated for testing', { paymentHash });

        res.json({
            success: true,
            data: {
                paymentHash,
                simulated: true,
                message: 'Invoice marked as settled for testing purposes',
            },
        });
    } catch (error: any) {
        logger.error('Error simulating payment', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to simulate payment',
            details: error.message,
        });
    }
});

export default router;