import { bitcoinService } from '../bitcoin/node';
import { logger } from '../../utils/logger';

interface CommitmentTransaction {
  txid: string;
  hex: string;
  fee: number;
  size: number;
  feeRate: number;
  anchorOutputs: AnchorOutput[];
}

interface AnchorOutput {
  vout: number;
  value: number;
  scriptPubKey: string;
}

export class AnchorMonitor {
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private trackedTransactions: Map<string, CommitmentTransaction> = new Map();

  // Start monitoring mempool for commitment transactions
  async startMonitoring(intervalMs: number = 10000) {
    if (this.isMonitoring) {
      logger.warn('Monitor already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting anchor output monitor', { intervalMs });

    this.monitorInterval = setInterval(async () => {
      await this.checkMempool();
    }, intervalMs);

    // Run immediately
    await this.checkMempool();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Stopped anchor output monitor');
  }

  // Check mempool for commitment transactions
  private async checkMempool() {
    try {
      const mempool = await bitcoinService.getRawMempool();
      
      logger.debug('Checking mempool', { 
        transactions: mempool.length,
        tracked: this.trackedTransactions.size
      });

      for (const txid of mempool) {
        if (!this.trackedTransactions.has(txid)) {
          await this.analyzeTransaction(txid);
        }
      }

      // Clean up confirmed transactions
      await this.cleanupConfirmedTransactions(mempool);
    } catch (error) {
      logger.error('Error checking mempool', { error });
    }
  }

  // Analyze a transaction to see if it's a commitment tx with anchor outputs
  private async analyzeTransaction(txid: string) {
    try {
      const tx = await bitcoinService.getTransaction(txid);
      
      // Look for anchor outputs (330 sats outputs)
      const anchorOutputs: AnchorOutput[] = [];
      
      for (let i = 0; i < tx.vout.length; i++) {
        const output = tx.vout[i];
        const valueInSats = Math.round(output.value * 100000000);
        
        // Anchor outputs are typically 330 sats
        if (valueInSats === 330) {
          anchorOutputs.push({
            vout: i,
            value: valueInSats,
            scriptPubKey: output.scriptPubKey.hex,
          });
          
          logger.info('Found potential anchor output', {
            txid,
            vout: i,
            value: valueInSats,
          });
        }
      }

      // If we found anchor outputs, this might be a commitment transaction
      if (anchorOutputs.length > 0) {
        const size = tx.vsize || tx.size;
        const fee = this.calculateFee(tx);
        const feeRate = Math.round((fee / size) * 100) / 100;

        const commitmentTx: CommitmentTransaction = {
          txid,
          hex: tx.hex,
          fee,
          size,
          feeRate,
          anchorOutputs,
        };

        this.trackedTransactions.set(txid, commitmentTx);

        logger.info('Tracking commitment transaction', {
          txid,
          feeRate,
          anchorOutputs: anchorOutputs.length,
        });

        // Check if it needs fee bumping
        await this.checkIfNeedsBumping(commitmentTx);
      }
    } catch (error) {
      logger.error('Error analyzing transaction', { txid, error });
    }
  }

  // Calculate transaction fee
  private calculateFee(tx: any): number {
    let inputValue = 0;
    let outputValue = 0;

    // Sum outputs
    for (const output of tx.vout) {
      outputValue += output.value * 100000000;
    }

    // Note: We can't easily get input values without fetching parent txs
    // For now, we'll estimate based on outputs
    // In production, you'd need to fetch all input transactions
    
    return 0; // Placeholder - will improve in next iteration
  }

  // Check if a commitment transaction needs fee bumping
  private async checkIfNeedsBumping(commitmentTx: CommitmentTransaction) {
    try {
      // Get current recommended fee rate
      const recommendedFeeRate = await bitcoinService.estimateFee(1);
      
      const MIN_FEE_RATE = parseInt(process.env.MIN_FEE_RATE || '10');
      
      logger.info('Checking if needs bumping', {
        txid: commitmentTx.txid,
        currentFeeRate: commitmentTx.feeRate,
        recommendedFeeRate,
        minFeeRate: MIN_FEE_RATE,
      });

      // If current fee is below minimum threshold, it needs bumping
      if (commitmentTx.feeRate < MIN_FEE_RATE && recommendedFeeRate > MIN_FEE_RATE) {
        logger.warn('Transaction needs fee bumping!', {
          txid: commitmentTx.txid,
          currentFeeRate: commitmentTx.feeRate,
          recommendedFeeRate,
        });

        // TODO: Trigger fee bumping service
        // await this.requestFeeBump(commitmentTx);
      }
    } catch (error) {
      logger.error('Error checking fee bump need', { error });
    }
  }

  // Clean up transactions that are no longer in mempool (confirmed or dropped)
  private async cleanupConfirmedTransactions(currentMempool: string[]) {
    const mempoolSet = new Set(currentMempool);
    
    for (const [txid, tx] of this.trackedTransactions.entries()) {
      if (!mempoolSet.has(txid)) {
        logger.info('Transaction no longer in mempool', { 
          txid,
          status: 'confirmed or dropped'
        });
        this.trackedTransactions.delete(txid);
      }
    }
  }

  // Get all tracked transactions
  getTrackedTransactions(): CommitmentTransaction[] {
    return Array.from(this.trackedTransactions.values());
  }

  // Get statistics
  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      trackedCount: this.trackedTransactions.size,
      transactions: this.getTrackedTransactions(),
    };
  }
}

export const anchorMonitor = new AnchorMonitor();
