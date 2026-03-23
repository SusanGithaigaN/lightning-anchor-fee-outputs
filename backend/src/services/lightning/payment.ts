import axios from 'axios';
import * as fs from 'fs';
import { logger } from '../../utils/logger';

interface InvoiceRequest {
  amountSats: number;
  memo: string;
  expiry?: number;
}

interface Invoice {
  paymentHash: string;
  paymentRequest: string;
  expiresAt: Date;
  amountSats: number;
}

interface PaymentStatus {
  paymentHash: string;
  settled: boolean;
  settledAt?: Date;
  amountPaidSats?: number;
}

export class LightningPaymentService {
  private lndRestUrl: string;
  private macaroon: string;

  constructor() {
    this.lndRestUrl = process.env.LND_REST_URL || 'https://localhost:8080';

    // Read macaroon for authentication
    const macaroonPath = process.env.LND_MACAROON_PATH || './docker/lnd/data/chain/bitcoin/regtest/admin.macaroon';

    try {
      const macaroonBuffer = fs.readFileSync(macaroonPath);
      this.macaroon = macaroonBuffer.toString('hex');
      logger.info('Lightning payment service initialized', {
        lndRestUrl: this.lndRestUrl,
      });
    } catch (error: any) {
      logger.error('Failed to load LND macaroon', {
        error: error.message,
        path: macaroonPath,
      });
      throw new Error(`Cannot initialize Lightning service: ${error.message}`);
    }
  }

  // Create a Lightning invoice for fee bump payment
  async createInvoice(request: InvoiceRequest): Promise<Invoice> {
    try {
      logger.info('Creating Lightning invoice', {
        amountSats: request.amountSats,
        memo: request.memo,
      });

      const response = await axios.post(
        `${this.lndRestUrl}/v1/invoices`,
        {
          value: request.amountSats.toString(),
          memo: request.memo,
          expiry: (request.expiry || 3600).toString(),
        },
        {
          headers: {
            'Grpc-Metadata-macaroon': this.macaroon,
          },
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false,
          }),
        }
      );

      const data = response.data;
      const expiresAt = new Date(Date.now() + (request.expiry || 3600) * 1000);

      logger.info('Invoice created', {
        paymentHash: data.r_hash,
        invoice: data.payment_request.substring(0, 50) + '...',
      });

      return {
        paymentHash: Buffer.from(data.r_hash, 'base64').toString('hex'),
        paymentRequest: data.payment_request,
        expiresAt,
        amountSats: request.amountSats,
      };
    } catch (error: any) {
      logger.error('Error creating invoice', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  //  Check if a Lightning invoice has been paid
  async checkPaymentStatus(paymentHash: string): Promise<PaymentStatus> {
    try {
      // Convert hex payment hash to base64 for LND API
      const paymentHashBase64 = Buffer.from(paymentHash, 'hex').toString('base64');

      const response = await axios.get(
        `${this.lndRestUrl}/v1/invoice/${paymentHashBase64}`,
        {
          headers: {
            'Grpc-Metadata-macaroon': this.macaroon,
          },
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false,
          }),
        }
      );

      const invoice = response.data;
      const settled = invoice.state === 'SETTLED';

      logger.debug('Payment status checked', {
        paymentHash,
        settled,
        state: invoice.state,
      });

      return {
        paymentHash,
        settled,
        settledAt: settled ? new Date(parseInt(invoice.settle_date) * 1000) : undefined,
        amountPaidSats: settled ? parseInt(invoice.amt_paid_sat) : undefined,
      };
    } catch (error: any) {
      logger.error('Error checking payment status', {
        paymentHash,
        error: error.message,
      });

      // If invoice not found, return as not settled
      if (error.response?.status === 404) {
        return {
          paymentHash,
          settled: false,
        };
      }

      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }

  // Wait for payment to be settled
  async waitForPayment(
    paymentHash: string,
    timeoutSeconds: number = 300
  ): Promise<boolean> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    logger.info('Waiting for payment', {
      paymentHash,
      timeoutSeconds,
    });

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkPaymentStatus(paymentHash);

      if (status.settled) {
        logger.info('Payment received!', {
          paymentHash,
          settledAt: status.settledAt,
          amountPaid: status.amountPaidSats,
        });
        return true;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    logger.warn('Payment timeout', {
      paymentHash,
      timeoutSeconds,
    });

    return false;
  }

  // Decode a Lightning invoice to get details
  async decodeInvoice(paymentRequest: string) {
    try {
      const response = await axios.get(
        `${this.lndRestUrl}/v1/payreq/${paymentRequest}`,
        {
          headers: {
            'Grpc-Metadata-macaroon': this.macaroon,
          },
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false,
          }),
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Error decoding invoice', {
        error: error.message,
      });
      throw new Error(`Failed to decode invoice: ${error.message}`);
    }
  }
}

export const lightningPaymentService = new LightningPaymentService();