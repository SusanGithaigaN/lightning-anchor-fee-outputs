import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

interface RpcRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[];
}

interface RpcResponse<T = any> {
  result: T;
  error: any;
  id: string;
}

export class BitcoinService {
  private client: AxiosInstance;

  constructor() {
    const auth = Buffer.from(
      `${process.env.BITCOIN_RPC_USER || 'bitcoinrpc'}:${process.env.BITCOIN_RPC_PASSWORD || 'changeme'}`
    ).toString('base64');

    this.client = axios.create({
      baseURL: `http://${process.env.BITCOIN_RPC_HOST || 'localhost'}:${process.env.BITCOIN_RPC_PORT || '18443'}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
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
      const response = await this.client.post<RpcResponse<T>>('/', request);
      
      if (response.data.error) {
        throw new Error(response.data.error.message || 'RPC error');
      }

      return response.data.result;
    } catch (error: any) {
      logger.error(`Bitcoin RPC error: ${method}`, { error: error.message });
      throw error;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const info = await this.getBlockchainInfo();
      logger.info('Bitcoin Core connected', {
        chain: info.chain,
        blocks: info.blocks,
        headers: info.headers,
      });
      return true;
    } catch (error) {
      logger.error('Bitcoin Core connection failed', { error });
      return false;
    }
  }

  // Get blockchain info
  async getBlockchainInfo() {
    return await this.call<{
      chain: string;
      blocks: number;
      headers: number;
      bestblockhash: string;
      difficulty: number;
      mediantime: number;
      verificationprogress: number;
    }>('getblockchaininfo');
  }

  // Get transaction details
  async getTransaction(txid: string) {
    return await this.call('getrawtransaction', [txid, true]);
  }

  // Get mempool info
  async getMempoolInfo() {
    return await this.call<{
      loaded: boolean;
      size: number;
      bytes: number;
      usage: number;
      maxmempool: number;
      mempoolminfee: number;
    }>('getmempoolinfo');
  }

  // Estimate fee rate
  async estimateFee(blocks: number = 1): Promise<number> {
    try {
      const result = await this.call<{
        feerate?: number;
        blocks: number;
      }>('estimatesmartfee', [blocks]);
      
      // Convert BTC/kB to sats/vbyte
      const satPerByte = result.feerate ? (result.feerate * 100000000) / 1000 : 1;
      return Math.ceil(satPerByte);
    } catch (error) {
      logger.warn('Fee estimation failed, using fallback', { error });
      return 1; // Fallback to 1 sat/vbyte for regtest
    }
  }

  // Send raw transaction
  async sendRawTransaction(hex: string): Promise<string> {
    return await this.call<string>('sendrawtransaction', [hex]);
  }

  // Get UTXO
  async getUtxo(txid: string, vout: number) {
    return await this.call('gettxout', [txid, vout]);
  }

  // Get raw mempool
  async getRawMempool() {
    return await this.call<string[]>('getrawmempool');
  }

  // Generate blocks (for testing)
  async generateBlocks(blocks: number): Promise<string[]> {
    try {
      return await this.call<string[]>('generatetoaddress', [
        blocks,
        await this.getNewAddress(),
      ]);
    } catch (error) {
      logger.error('Failed to generate blocks', { error });
      throw error;
    }
  }

  // Get new address (for testing)
  private async getNewAddress(): Promise<string> {
    return await this.call<string>('getnewaddress');
  }
}

export const bitcoinService = new BitcoinService();
