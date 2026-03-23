import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import { logger } from '../../utils/logger';

interface CreateInvoiceRequest {
  amount: number; // Amount in satoshis
  memo?: string;
  expiry?: number; // Expiry in seconds (default: 3600)
}

interface Invoice {
  paymentHash: string;
  paymentRequest: string; // The actual invoice (lnbc...)
  amount: number;
  memo: string;
  expiresAt: Date;
  createdAt: Date;
}

interface PaymentStatus {
  paid: boolean;
  settled: boolean;
  settleDate?: Date;
  amountPaid?: number;
}

export class LightningService {
  private client: AxiosInstance;
  private macaroon: string;

  constructor() {
    // Read the admin macaroon
    const macaroonPath = process.env.LND_MACAROON_PATH || './docker/lnd/data/chain/bitcoin/regtest/admin.macaroon';
    const macaroonHex = fs.readFileSync(macaroonPath).toString('hex');
    this.macaroon = macaroonHex;

    // Read TLS cert for HTTPS
    const tlsCertPath = process.env.LND_TLS_CERT_PATH || './docker/lnd/tls.cert';
    const tlsCert = fs.readFileSync(tlsCertPath);

    // Create HTTPS agent with the TLS cert
    const httpsAgent = new https.Agent({
      ca: tlsCert,
      rejectUnauthorized: false, // For regtest, we can be less strict
    });

    // Setup REST client
    const restHost = process.env.LND_REST_HOST || 'https://localhost:8080';
    
    this.client = axios.create({
      baseURL: restHost,
      httpsAgent,
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      },
    });

    logger.info('Lightning service initialized', {
      restHost,
    });
  }

  /**
   * Get LND node info
   */
  async getInfo() {
    try {
      const response = await this.client.get('/v1/getinfo');
      return response.data;
    } catch (error: any) {
      logger.error('Error getting LND info', { error: error.message });
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    try {
      const response = await this.client.get('/v1/balance/blockchain');
      return response.data;
    } catch (error: any) {
      logger.error('Error getting wallet balance', { error: error.message });
      throw error;
    }
  }

  /**
   * List channels
   */
  async listChannels() {
    try {
      const response = await this.client.get('/v1/channels');
      return response.data;
    } catch (error: any) {
      logger.error('Error listing channels', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a Lightning invoice for fee bump payment
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    try {
      logger.info('Creating Lightning invoice', {
        amount: request.amount,
        memo: request.memo,
      });

      const expiry = request.expiry || 3600; // 1 hour default

      const response = await this.client.post('/v1/invoices', {
        value: request.amount.toString(),
        memo: request.memo || 'CPFP Fee Bump Service',
        expiry: expiry.toString(),
      });

      const data = response.data;

      logger.info('Invoice created', {
        paymentHash: data.r_hash,
        paymentRequest: data.payment_request,
      });

      return {
        paymentHash: Buffer.from(data.r_hash, 'base64').toString('hex'),
        paymentRequest: data.payment_request,
        amount: request.amount,
        memo: request.memo || 'CPFP Fee Bump Service',
        expiresAt: new Date(Date.now() + expiry * 1000),
        createdAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Error creating invoice', { 
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Check if an invoice has been paid
   */
  async checkPayment(paymentHash: string): Promise<PaymentStatus> {
    try {
      logger.debug('Checking payment status', { paymentHash });

      // Convert hex payment hash to base64 for LND API
      const paymentHashBase64 = Buffer.from(paymentHash, 'hex').toString('base64');

      const response = await this.client.get(`/v1/invoice/${paymentHashBase64}`);
      const invoice = response.data;

      const paid = invoice.state === 'SETTLED';
      const settled = invoice.settled || false;

      logger.debug('Payment status', {
        paymentHash,
        state: invoice.state,
        paid,
        settled,
      });

      return {
        paid,
        settled,
        settleDate: settled ? new Date(parseInt(invoice.settle_date) * 1000) : undefined,
        amountPaid: settled ? parseInt(invoice.amt_paid_sat) : undefined,
      };
    } catch (error: any) {
      logger.error('Error checking payment', { 
        paymentHash,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Decode a Lightning invoice (payment request)
   */
  async decodeInvoice(paymentRequest: string) {
    try {
      const response = await this.client.get(`/v1/payreq/${paymentRequest}`);
      return response.data;
    } catch (error: any) {
      logger.error('Error decoding invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe to invoice updates (for real-time payment detection)
   * Returns a promise that resolves when the invoice is paid
   */
  async waitForPayment(paymentHash: string, timeoutMs: number = 3600000): Promise<boolean> {
    const startTime = Date.now();
    
    logger.info('Waiting for payment', { paymentHash, timeoutMs });

    // Poll every 2 seconds
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          // Check if timeout exceeded
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            logger.warn('Payment wait timeout', { paymentHash });
            resolve(false);
            return;
          }

          // Check payment status
          const status = await this.checkPayment(paymentHash);
          
          if (status.paid && status.settled) {
            clearInterval(checkInterval);
            logger.info('Payment received!', { 
              paymentHash,
              amountPaid: status.amountPaid,
              settleDate: status.settleDate,
            });
            resolve(true);
            return;
          }

        } catch (error: any) {
          logger.error('Error in payment polling', { 
            paymentHash,
            error: error.message,
          });
          // Continue polling even on errors
        }
      }, 2000); // Check every 2 seconds
    });
  }
}

export const lightningService = new LightningService();