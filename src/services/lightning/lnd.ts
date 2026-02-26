import fs from 'fs';
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { logger } from '../../utils/logger';

export class LNDService {
  private client: AxiosInstance;

  constructor() {
    // LND REST API runs on port 8080 by default in our docker-compose
    const baseURL = 'https://localhost:8080';
    
    let macaroon = '';
    
    // Try to read macaroon
    const macaroonPath = './docker/lnd/data/chain/bitcoin/regtest/admin.macaroon';
    try {
      if (fs.existsSync(macaroonPath)) {
        const macaroonFile = fs.readFileSync(macaroonPath);
        macaroon = macaroonFile.toString('hex');
        logger.info('LND macaroon loaded successfully');
      } else {
        logger.warn('LND macaroon not found at:', macaroonPath);
      }
    } catch (error) {
      logger.warn('Could not read macaroon file', { error });
    }

    this.client = axios.create({
      baseURL,
      headers: macaroon ? {
        'Grpc-Metadata-macaroon': macaroon,
      } : {},
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Ignore self-signed cert
      }),
      timeout: 5000,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const info = await this.getInfo();
      logger.info('LND connected', {
        alias: info.alias,
        pubkey: info.identity_pubkey?.substring(0, 20) + '...',
        version: info.version,
      });
      return true;
    } catch (error: any) {
      logger.error('LND connection failed', { 
        error: error.message,
        hint: 'Make sure LND is running and macaroon file exists'
      });
      return false;
    }
  }

  async getInfo() {
    const response = await this.client.get('/v1/getinfo');
    return response.data;
  }

  async getWalletBalance() {
    const response = await this.client.get('/v1/balance/blockchain');
    return response.data;
  }

  async listChannels() {
    const response = await this.client.get('/v1/channels');
    return response.data;
  }

  async getPendingChannels() {
    const response = await this.client.get('/v1/channels/pending');
    return response.data;
  }
}

export const lndService = new LNDService();
