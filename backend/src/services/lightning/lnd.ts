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

function looksLikePem(value: string): boolean {
  return value.includes('-----BEGIN');
}

function looksLikeBase64(value: string): boolean {
  const normalized = value.replace(/\s+/g, '');
  return normalized.length >= 100
    && normalized.length % 4 === 0
    && /^[A-Za-z0-9+/=]+$/.test(normalized);
}

function loadCredentialBuffer(base64Env: string, pathEnv: string, fallbackPath: string): Buffer {
  const base64Value = process.env[base64Env]?.trim();
  if (base64Value) {
    return Buffer.from(base64Value, 'base64');
  }

  const configuredValue = process.env[pathEnv]?.trim();
  if (!configuredValue) {
    return fs.readFileSync(fallbackPath);
  }

  if (looksLikePem(configuredValue)) {
    return Buffer.from(configuredValue, 'utf8');
  }

  if (looksLikeBase64(configuredValue)) {
    return Buffer.from(configuredValue, 'base64');
  }

  return fs.readFileSync(configuredValue);
}

function loadMacaroonHex(fallbackPath: string): string {
  const base64Value = process.env.LND_MACAROON_BASE64?.trim();
  if (base64Value) {
    return Buffer.from(base64Value, 'base64').toString('hex');
  }

  const configuredValue = process.env.LND_MACAROON_PATH?.trim();
  if (!configuredValue) {
    return fs.readFileSync(fallbackPath).toString('hex');
  }

  if (looksLikeBase64(configuredValue)) {
    return Buffer.from(configuredValue, 'base64').toString('hex');
  }

  return fs.readFileSync(configuredValue).toString('hex');
}

export class LightningService {
  private lightning: any;

  constructor() {
    const grpcHost = process.env.LND_GRPC_HOST || 'localhost:10009';
    const tlsCert = loadCredentialBuffer(
      'LND_TLS_CERT_BASE64',
      'LND_TLS_CERT_PATH',
      './docker/lnd/tls.cert'
    );
    const macaroonHex = loadMacaroonHex('./docker/lnd/data/chain/bitcoin/regtest/admin.macaroon');

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

    // Create SSL credentials
    const sslCreds = grpc.credentials.createSsl(tlsCert);

    // Create macaroon credentials
    const macaroonCreds = grpc.credentials.createFromMetadataGenerator((_, callback) => {
      const metadata = new grpc.Metadata();
      metadata.add('macaroon', macaroonHex);
      callback(null, metadata);
    });

    // Combine credentials
    const credentials = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);

    // Initialize Lightning client
    this.lightning = new lnrpc.Lightning(grpcHost, credentials);

    logger.info('Lightning gRPC service initialized', { 
      grpcHost,
      network: process.env.BITCOIN_NETWORK || 'regtest',
      usingBase64Creds: !!process.env.LND_MACAROON_BASE64
    });
  }

  private call(method: string, params: object, timeoutMs?: number): Promise<any> {
    const effectiveTimeoutMs = timeoutMs ?? parseInt(process.env.LND_RPC_TIMEOUT_MS || '10000', 10);

    return new Promise((resolve, reject) => {
      const metadata = new grpc.Metadata();
      const deadline = new Date(Date.now() + effectiveTimeoutMs);

      this.lightning[method](params, metadata, { deadline }, (err: any, res: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
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
      logger.error('Error creating invoice', { error: error.message, code: error.code });

      if (error.code === grpc.status.DEADLINE_EXCEEDED || /deadline exceeded|timed out/i.test(error.message)) {
        throw new Error(
          'LND invoice request timed out. For local regtest, make sure bitcoind has a loaded wallet and mine a fresh block so the node can catch up.'
        );
      }

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