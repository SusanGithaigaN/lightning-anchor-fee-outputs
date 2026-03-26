import { lightningService } from './lnd';
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
  constructor() {
    logger.info('Lightning payment service initialized (gRPC)');
  }

  async createInvoice(request: InvoiceRequest): Promise<Invoice> {
    const invoice = await lightningService.createInvoice({
      amount: request.amountSats,
      memo: request.memo,
      expiry: request.expiry,
    });

    return {
      paymentHash: invoice.paymentHash,
      paymentRequest: invoice.paymentRequest,
      expiresAt: invoice.expiresAt,
      amountSats: invoice.amount,
    };
  }

  async checkPaymentStatus(paymentHash: string): Promise<PaymentStatus> {
    const status = await lightningService.checkPayment(paymentHash);

    return {
      paymentHash,
      settled: status.settled,
      settledAt: status.settleDate,
      amountPaidSats: status.amountPaid,
    };
  }

  async waitForPayment(paymentHash: string, timeoutSeconds: number = 300): Promise<boolean> {
    return lightningService.waitForPayment(paymentHash, timeoutSeconds * 1000);
  }

  async decodeInvoice(paymentRequest: string) {
    return lightningService.decodeInvoice(paymentRequest);
  }
}

export const lightningPaymentService = new LightningPaymentService();
