import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

interface CreateInvoiceRequest {
  amount: number;
  memo?: string;
  expiry?: number;
}

interface Invoice {
  paymentHash: string;
  paymentRequest: string;
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
  private lightning: any;

  constructor() {
    const grpcHost = process.env.LND_GRPC_HOST || 'localhost:10009';
    const tlsCertPath = process.env.LND_TLS_CERT_PATH || './docker/lnd/tls.cert';
    const macaroonPath = process.env.LND_MACAROON_PATH || './docker/lnd/data/chain/bitcoin/regtest/admin.macaroon';

    // Load proto
    const protoPath = path.join(__dirname, 'rpc.proto');
    const packageDef = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const lnrpc = (grpc.loadPackageDefinition(packageDef) as any).lnrpc;

    // TLS credentials
    // const tlsCert = fs.readFileSync(tlsCertPath);
    // const sslCreds = grpc.credentials.createSsl(tlsCert);

    // use encoded cert from env
    const tlsCert = process.env.LND_TLS_CERT_BASE64
      ? Buffer.from(process.env.LND_TLS_CERT_BASE64, 'base64')
      : fs.readFileSync(tlsCertPath);
    const sslCreds = grpc.credentials.createSsl(tlsCert);

    // Macaroon credentials
    // const macaroonHex = fs.readFileSync(macaroonPath).toString('hex');
    const macaroonHex = process.env.LND_MACAROON_BASE64
      ? Buffer.from(process.env.LND_MACAROON_BASE64, 'base64').toString('hex')
      : fs.readFileSync(macaroonPath).toString('hex');

    const macaroonCreds = grpc.credentials.createFromMetadataGenerator((_, callback) => {
      const metadata = new grpc.Metadata();
      metadata.add('macaroon', macaroonHex);
      callback(null, metadata);
    });

    const credentials = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);

    this.lightning = new lnrpc.Lightning(grpcHost, credentials);

    logger.info('Lightning gRPC service initialized', { grpcHost });
  }

  private call(method: string, params: object): Promise<any> {
    return new Promise((resolve, reject) => {
      this.lightning[method](params, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  async getInfo() {
    return this.call('getInfo', {});
  }

  async getBalance() {
    return this.call('walletBalance', {});
  }

  async listChannels() {
    return this.call('listChannels', {});
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    try {
      logger.info('Creating Lightning invoice', {
        amountSats: request.amount,
        memo: request.memo,
      });

      const expiry = request.expiry || 3600;

      const response = await this.call('addInvoice', {
        value: request.amount,
        memo: request.memo || 'CPFP Fee Bump Service',
        expiry,
      });

      const paymentHash = Buffer.from(response.r_hash, 'base64').toString('hex');

      logger.info('Invoice created successfully', {
        paymentHash,
        paymentRequest: response.payment_request?.substring(0, 30) + '...',
      });

      return {
        paymentHash,
        paymentRequest: response.payment_request,
        amount: request.amount,
        memo: request.memo || 'CPFP Fee Bump Service',
        expiresAt: new Date(Date.now() + expiry * 1000),
        createdAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Error creating invoice', { error: error.message });
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  async checkPayment(paymentHash: string): Promise<PaymentStatus> {
    try {
      const paymentHashBytes = Buffer.from(paymentHash, 'hex');

      const response = await this.call('lookupInvoice', {
        r_hash: paymentHashBytes,
      });

      const paid = response.state === 'SETTLED';

      return {
        paid,
        settled: paid,
        settleDate: paid ? new Date(parseInt(response.settle_date) * 1000) : undefined,
        amountPaid: paid ? parseInt(response.amt_paid_sat) : undefined,
      };
    } catch (error: any) {
      logger.error('Error checking payment', { paymentHash, error: error.message });
      throw error;
    }
  }

  async decodeInvoice(paymentRequest: string) {
    return this.call('decodePayReq', { pay_req: paymentRequest });
  }

  async waitForPayment(paymentHash: string, timeoutMs: number = 3600000): Promise<boolean> {
    const startTime = Date.now();
    logger.info('Waiting for payment', { paymentHash });

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
          return;
        }
        try {
          const status = await this.checkPayment(paymentHash);
          if (status.paid) {
            clearInterval(checkInterval);
            resolve(true);
          }
        } catch {
          // continue polling
        }
      }, 2000);
    });
  }
}

export const lightningService = new LightningService();
