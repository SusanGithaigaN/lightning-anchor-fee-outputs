import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

interface RpcRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[];
}

type BitcoinBackend = 'rpc' | 'mempool';

function normalizeNetwork(network: string): string {
  const configured = (network || 'regtest').toLowerCase();

  if (configured === 'bitcoin') {
    return 'mainnet';
  }

  return configured;
}

function defaultMempoolApiBaseUrl(network: string): string {
  switch (network) {
    case 'testnet':
    case 'testnet3':
      return 'https://mempool.space/testnet/api';
    case 'signet':
      return 'https://mempool.space/signet/api';
    default:
      return 'https://mempool.space/api';
  }
}

export class BitcoinService {
  private rpcClient?: AxiosInstance;
  private mempoolClient?: AxiosInstance;
  private backend: BitcoinBackend;
  private network: string;

  constructor() {
    this.network = normalizeNetwork(process.env.BITCOIN_NETWORK || 'regtest');

    const requestedBackend = (process.env.BITCOIN_BACKEND || '').trim().toLowerCase();
    const hasExplicitRpcHost = !!process.env.BITCOIN_RPC_HOST?.trim();

    this.backend = requestedBackend === 'mempool' || (!hasExplicitRpcHost && this.network !== 'regtest')
      ? 'mempool'
      : 'rpc';

    if (this.backend === 'mempool') {
      const mempoolApiBaseUrl = process.env.MEMPOOL_API_BASE_URL?.trim() || defaultMempoolApiBaseUrl(this.network);

      this.mempoolClient = axios.create({
        baseURL: mempoolApiBaseUrl,
        timeout: parseInt(process.env.BITCOIN_RPC_TIMEOUT_MS || '10000', 10),
      });

      logger.info('Bitcoin mempool.space service initialized', {
        backend: this.backend,
        baseURL: mempoolApiBaseUrl,
        network: this.network,
      });
      return;
    }

    const auth = Buffer.from(
      `${process.env.BITCOIN_RPC_USER || 'bitcoinrpc'}:${process.env.BITCOIN_RPC_PASSWORD || 'changeme'}`
    ).toString('base64');

    const host = process.env.BITCOIN_RPC_HOST || 'localhost';
    const port = process.env.BITCOIN_RPC_PORT || (this.network === 'mainnet' ? '8332' : '18443');

    const baseURL = host.startsWith('http')
      ? `${host}:${port}`
      : `http://${host}:${port}`;

    this.rpcClient = axios.create({
      baseURL,
      timeout: parseInt(process.env.BITCOIN_RPC_TIMEOUT_MS || '10000', 10),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
    });

    logger.info('Bitcoin RPC service initialized', {
      backend: this.backend,
      baseURL,
      network: this.network,
    });
  }

  private async call<T = any>(method: string, params: any[] = []): Promise<T> {
    if (!this.rpcClient) {
      throw new Error(`Bitcoin RPC method ${method} is unavailable while BITCOIN_BACKEND=${this.backend}`);
    }

    const request: RpcRequest = {
      jsonrpc: '1.0',
      id: Date.now().toString(),
      method,
      params,
    };

    try {
      const response = await this.rpcClient.post('/', request);

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

  private async mempoolGet<T = any>(path: string, responseType: 'json' | 'text' = 'json'): Promise<T> {
    if (!this.mempoolClient) {
      throw new Error(`mempool.space client is unavailable while BITCOIN_BACKEND=${this.backend}`);
    }

    try {
      const response = await this.mempoolClient.get(path, {
        responseType: responseType === 'text' ? 'text' : 'json',
      });

      return responseType === 'text'
        ? String(response.data).trim() as T
        : response.data as T;
    } catch (error: any) {
      logger.error('mempool.space API error', {
        path,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async getBlockchainInfo() {
    if (this.backend === 'mempool') {
      const [height, hash] = await Promise.all([
        this.mempoolGet<string>('/blocks/tip/height', 'text'),
        this.mempoolGet<string>('/blocks/tip/hash', 'text'),
      ]);

      const blocks = parseInt(height, 10);

      return {
        chain: this.network,
        blocks,
        headers: blocks,
        bestblockhash: hash,
        initialblockdownload: false,
        backend: 'mempool-space',
      };
    }

    return await this.call('getblockchaininfo');
  }

  async getTransaction(txid: string) {
    if (this.backend === 'mempool') {
      const tx = await this.mempoolGet<any>(`/tx/${txid}`);
      const hex = await this.mempoolGet<string>(`/tx/${txid}/hex`, 'text').catch(() => '');

      return {
        txid: tx.txid,
        hash: tx.txid,
        version: tx.version,
        size: tx.size,
        vsize: tx.weight ? Math.ceil(tx.weight / 4) : tx.size,
        weight: tx.weight,
        locktime: tx.locktime,
        fee: tx.fee,
        vin: (tx.vin || []).map((input: any) => ({
          txid: input.txid,
          vout: input.vout,
          sequence: input.sequence,
          prevout: input.prevout
            ? {
                value: input.prevout.value / 100000000,
              }
            : undefined,
        })),
        vout: (tx.vout || []).map((output: any, index: number) => ({
          value: output.value / 100000000,
          n: index,
          scriptPubKey: {
            hex: output.scriptpubkey,
            asm: output.scriptpubkey_asm,
            address: output.scriptpubkey_address,
            type: output.scriptpubkey_type,
          },
        })),
        status: tx.status,
        hex,
        blockhash: tx.status?.block_hash,
        confirmations: tx.status?.confirmed ? 1 : 0,
        time: tx.status?.block_time,
        blocktime: tx.status?.block_time,
      };
    }

    return await this.call('getrawtransaction', [txid, true]);
  }

  async getRawMempool(): Promise<string[]> {
    if (this.backend === 'mempool') {
      return await this.mempoolGet<string[]>('/mempool/txids');
    }

    return await this.call('getrawmempool');
  }

  async getMempoolInfo() {
    if (this.backend === 'mempool') {
      const info = await this.mempoolGet<any>('/mempool');
      return {
        ...info,
        backend: 'mempool-space',
      };
    }

    return await this.call('getmempoolinfo');
  }

  async estimateFee(blocks: number = 1): Promise<number> {
    if (this.backend === 'mempool') {
      const fees = await this.mempoolGet<any>('/v1/fees/recommended');

      if (blocks <= 1) return fees.fastestFee ?? 1;
      if (blocks <= 3) return fees.halfHourFee ?? fees.fastestFee ?? 1;
      if (blocks <= 6) return fees.hourFee ?? fees.halfHourFee ?? fees.fastestFee ?? 1;
      return fees.minimumFee ?? fees.hourFee ?? 1;
    }

    const result = await this.call<{ feerate?: number }>('estimatesmartfee', [blocks]);
    const satPerByte = result.feerate ? (result.feerate * 100000000) / 1000 : 1;
    return Math.ceil(satPerByte);
  }

  async sendRawTransaction(hexString: string): Promise<string> {
    logger.info('Broadcasting transaction', {
      backend: this.backend,
      size: hexString.length / 2,
    });

    try {
      if (this.backend === 'mempool') {
        if (!this.mempoolClient) {
          throw new Error('mempool.space client not configured');
        }

        const response = await this.mempoolClient.post('/tx', hexString, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });

        const txid = String(response.data).trim();
        logger.info('Transaction broadcast successful', { txid });
        return txid;
      }

      const txid = await this.call<string>('sendrawtransaction', [hexString]);

      logger.info('Transaction broadcast successful', { txid });
      return txid;
    } catch (error: any) {
      logger.error('Transaction broadcast failed', {
        backend: this.backend,
        error: error.message,
      });
      throw new Error(`Broadcast failed: ${error.message}`);
    }
  }

  async testMempoolAccept(hexString: string) {
    if (this.backend === 'mempool') {
      logger.warn('testMempoolAccept is not supported by mempool.space', {
        size: hexString.length / 2,
      });

      return [{
        allowed: null,
        rejectReason: 'testmempoolaccept is not available via mempool.space',
      }];
    }

    return await this.call('testmempoolaccept', [[hexString]]);
  }
}

export const bitcoinService = new BitcoinService();