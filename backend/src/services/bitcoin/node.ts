import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

interface RpcRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[];
}

export class BitcoinService {
  private client: AxiosInstance;

  constructor() {
    const auth = Buffer.from(
      `${process.env.BITCOIN_RPC_USER}:${process.env.BITCOIN_RPC_PASSWORD}`
    ).toString('base64');

    const host = process.env.BITCOIN_RPC_HOST || 'localhost';
    const port = process.env.BITCOIN_RPC_PORT || '18443';

    // Ensure URL has protocol
    const baseURL = host.startsWith('http')
      ? `${host}:${port}`
      : `http://${host}:${port}`;

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
    });

    logger.info('Bitcoin RPC service initialized', {
      baseURL,
      network: process.env.BITCOIN_NETWORK || 'regtest',
    });
  }

  private async call<T = any>(method: string, params: any[] = []): Promise<T> {
    const request: RpcRequest = {
      jsonrpc: '1.0',
      id: Date.now().toString(),
      method,
      params,
    };

    try {
      const response = await this.client.post('/', request);

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error: any) {
      logger.error('Bitcoin RPC error', {
        method,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async getBlockchainInfo() {
    return await this.call('getblockchaininfo');
  }

  async getTransaction(txid: string) {
    return await this.call('getrawtransaction', [txid, true]);
  }

  async getRawMempool(): Promise<string[]> {
    return await this.call('getrawmempool');
  }

  async getMempoolInfo() {
    return await this.call('getmempoolinfo');
  }

  async estimateFee(blocks: number = 1): Promise<number> {
    const result = await this.call<{ feerate?: number }>('estimatesmartfee', [blocks]);
    const satPerByte = result.feerate ? (result.feerate * 100000000) / 1000 : 1;
    return Math.ceil(satPerByte);
  }
  // Broadcast a raw transaction to the network
  async sendRawTransaction(hexString: string): Promise<string> {
    logger.info('Broadcasting transaction', {
      size: hexString.length / 2,
    });

    try {
      const txid = await this.call<string>('sendrawtransaction', [hexString]);

      logger.info('Transaction broadcast successful', { txid });

      return txid;
    } catch (error: any) {
      logger.error('Transaction broadcast failed', {
        error: error.message,
      });
      throw new Error(`Broadcast failed: ${error.message}`);
    }
  }

  // Test mempool acceptance without broadcasting
  async testMempoolAccept(hexString: string) {
    return await this.call('testmempoolaccept', [[hexString]]);
  }
}

export const bitcoinService = new BitcoinService();