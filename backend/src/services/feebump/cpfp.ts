import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { bitcoinService } from '../bitcoin/node';
import { logger } from '../../utils/logger';

// Initialize ECC library for bitcoinjs-lib
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

interface CPFPRequest {
  parentTxid: string;
  anchorVout?: number;
  targetFeeRate: number;
  maxFee?: number;
}

interface CPFPResult {
  success: boolean;
  childTxid?: string;
  childTxHex?: string;
  feePaid?: number;
  error?: string;
}

function satsFromBtc(value: number): number {
  return Math.round(value * 100000000);
}

function resolveAnchorOutput(parentTx: any, requestedVout?: number) {
  const outputs = Array.isArray(parentTx?.vout) ? parentTx.vout : [];
  const hasRequestedVout = Number.isInteger(requestedVout)
    && requestedVout! >= 0
    && requestedVout! < outputs.length;

  const detectedAnchorVout = outputs.findIndex((output: any) => output && satsFromBtc(output.value) === 330);
  const requestedOutput = hasRequestedVout ? outputs[requestedVout as number] : undefined;
  const requestedIsAnchor = requestedOutput ? satsFromBtc(requestedOutput.value) === 330 : false;

  const resolvedVout = requestedIsAnchor
    ? requestedVout as number
    : detectedAnchorVout >= 0
      ? detectedAnchorVout
      : hasRequestedVout
        ? requestedVout as number
        : -1;

  const resolvedOutput = resolvedVout >= 0 ? outputs[resolvedVout] : undefined;
  const anchorValue = resolvedOutput ? satsFromBtc(resolvedOutput.value) : 0;

  return {
    outputs,
    detectedAnchorVout,
    resolvedVout,
    resolvedOutput,
    anchorValue,
    isAnchorOutput: anchorValue === 330,
    usedAutoDetectedAnchor: detectedAnchorVout >= 0 && resolvedVout !== requestedVout,
  };
}

function resolveBitcoinNetwork(): { name: string; network: bitcoin.Network } {
  const configuredNetwork = (process.env.BITCOIN_NETWORK || 'regtest').toLowerCase();

  switch (configuredNetwork) {
    case 'mainnet':
    case 'bitcoin':
      return { name: 'mainnet', network: bitcoin.networks.bitcoin };
    case 'testnet':
    case 'testnet3':
      return { name: 'testnet', network: bitcoin.networks.testnet };
    default:
      return { name: 'regtest', network: bitcoin.networks.regtest };
  }
}

export class CPFPService {
  private network: bitcoin.Network;
  private walletKeyPair: any; 

  constructor() {
    const { name, network } = resolveBitcoinNetwork();
    this.network = network;

    // Generate a keypair for testing
    // In production, you'd load this from a secure wallet
    this.walletKeyPair = ECPair.makeRandom({ network: this.network });

    logger.info('CPFP Service initialized', {
      network: name,
      walletAddress: bitcoin.payments.p2wpkh({
        pubkey: this.walletKeyPair.publicKey,
        network: this.network,
      }).address,
    });
  }

  // Create and broadcast a CPFP transaction to bump parent tx fee
  async createCPFPTransaction(request: CPFPRequest): Promise<CPFPResult> {
    try {
      logger.info('Creating CPFP transaction', {
        parentTxid: request.parentTxid,
        anchorVout: request.anchorVout,
        targetFeeRate: request.targetFeeRate,
      });

      // Step 1: Get the parent transaction
      const parentTx = await bitcoinService.getTransaction(request.parentTxid);
      if (!parentTx) {
        return {
          success: false,
          error: 'Parent transaction not found',
        };
      }

      // Step 2: Resolve and verify the 330-sat anchor output
      const {
        detectedAnchorVout,
        resolvedVout,
        resolvedOutput: anchorOutput,
        anchorValue,
        isAnchorOutput,
        usedAutoDetectedAnchor,
      } = resolveAnchorOutput(parentTx, request.anchorVout);

      if (!anchorOutput) {
        return {
          success: false,
          error: detectedAnchorVout >= 0
            ? `Anchor output ${request.anchorVout} not found. Try output index ${detectedAnchorVout}.`
            : 'No 330-sat anchor output found on this transaction.',
        };
      }

      if (!isAnchorOutput) {
        return {
          success: false,
          error: `Output ${resolvedVout} is ${anchorValue} sats, not 330 (not an anchor output)`,
        };
      }

      logger.info('Anchor output verified', {
        requestedVout: request.anchorVout,
        resolvedVout,
        autoDetected: usedAutoDetectedAnchor,
        value: anchorValue,
        scriptPubKey: anchorOutput.scriptPubKey.hex,
      });

      // Step 3: Calculate fees needed
      const parentSize = parentTx.vsize || parentTx.size;
      const parentFee = await this.calculateActualFee(request.parentTxid);
      const parentFeeRate = parentFee > 0
        ? Math.ceil((parentFee / parentSize) * 100) / 100
        : 0;

      logger.info('Parent transaction info', {
        size: parentSize,
        currentFee: parentFee,
        currentFeeRate: parentFeeRate,
      });

      // Step 4: Calculate child transaction size and fees
      const childSize = 110; 
      const totalSize = parentSize + childSize;
      const totalFeeNeeded = Math.ceil(totalSize * request.targetFeeRate);
      const childFeeNeeded = totalFeeNeeded - parentFee;

      logger.info('Fee calculation', {
        parentSize,
        childSize,
        totalSize,
        targetFeeRate: request.targetFeeRate,
        totalFeeNeeded,
        parentFee,
        childFeeNeeded,
      });

      // Step 5: Check if we have enough in anchor output
      if (childFeeNeeded > anchorValue) {
        return {
          success: false,
          error: `Child fee needed (${childFeeNeeded} sats) exceeds anchor value (${anchorValue} sats). Need additional inputs.`,
        };
      }

      // Step 6: Check if max fee constraint is met
      if (request.maxFee && childFeeNeeded > request.maxFee) {
        return {
          success: false,
          error: `Child fee needed (${childFeeNeeded} sats) exceeds max fee (${request.maxFee} sats)`,
        };
      }

      // Step 7: Build the CPFP transaction
      logger.info('Building CPFP transaction...');

      const psbt = new bitcoin.Psbt({ network: this.network });

      // Add the anchor output as input
      const anchorScriptPubKey = Buffer.from(anchorOutput.scriptPubKey.hex, 'hex');

      psbt.addInput({
        hash: request.parentTxid,
        index: resolvedVout,
        witnessUtxo: {
          script: anchorScriptPubKey,
          value: BigInt(anchorValue),
        },
      });

      // Calculate change amount (what's left after paying fee)
      const changeAmount = anchorValue - childFeeNeeded;

      if (changeAmount < 0) {
        return {
          success: false,
          error: 'Not enough funds in anchor output to pay fee',
        };
      }

      // Add output to our wallet (change)
      const changeAddress = bitcoin.payments.p2wpkh({
        pubkey: this.walletKeyPair.publicKey,
        network: this.network,
      }).address!;

      if (changeAmount > 0) {
        psbt.addOutput({
          address: changeAddress,
          value: BigInt(changeAmount),
        });
      } else {
        logger.warn('No change output - entire anchor goes to fees');
      }

      logger.info('Transaction structure', {
        inputs: 1,
        outputs: changeAmount > 0 ? 1 : 0,
        changeAmount,
        feeAmount: childFeeNeeded,
      });

      // Step 8: Sign the transaction
      logger.info('Signing transaction...');

      try {
        psbt.signInput(0, this.walletKeyPair);
        psbt.validateSignaturesOfInput(0, () => true);
        psbt.finalizeAllInputs();
      } catch (signError: any) {
        logger.error('Signing failed', { error: signError.message });
        return {
          success: false,
          error: `Transaction signing failed: ${signError.message}. This is expected - the anchor output belongs to the Lightning channel, not our test wallet.`,
        };
      }

      // Step 9: Extract the raw transaction
      const childTx = psbt.extractTransaction();
      const childTxHex = childTx.toHex();
      const childTxid = childTx.getId();

      logger.info('CPFP transaction created', {
        childTxid,
        size: childTx.virtualSize(),
        weight: childTx.weight(),
        fee: childFeeNeeded,
      });

      // We're not broadcasting yet. will be in the /broadcast endpoint
      return {
        success: true,
        childTxid,
        childTxHex,
        feePaid: childFeeNeeded,
      };

    } catch (error: any) {
      logger.error('Error creating CPFP transaction', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Calculate the actual fee of a transaction
  async calculateActualFee(txid: string): Promise<number> {
    try {
      const tx = await bitcoinService.getTransaction(txid);

      let inputValue = 0;
      let outputValue = 0;

      // Sum all outputs
      for (const vout of tx.vout) {
        outputValue += vout.value * 100000000;
      }

      // Sum all inputs (need to fetch each input's previous tx)
      for (const vin of tx.vin) {
        if (vin.txid) {
          const prevTx = await bitcoinService.getTransaction(vin.txid);
          const prevOut = prevTx.vout[vin.vout];
          inputValue += prevOut.value * 100000000;
        }
      }

      const fee = inputValue - outputValue;

      logger.debug('Calculated actual fee', {
        txid,
        inputValue,
        outputValue,
        fee,
      });

      return Math.round(fee);

    } catch (error: any) {
      logger.error('Error calculating actual fee', {
        txid,
        error: error.message
      });
      return 0;
    }
  }

  // Estimate fee bump for tx
  async estimateFeeBump(request: CPFPRequest) {
    try {
      const parentTx = await bitcoinService.getTransaction(request.parentTxid);

      if (!Array.isArray(parentTx?.vout) || parentTx.vout.length === 0) {
        throw new Error('Transaction outputs could not be read for fee estimation');
      }

      const parentSize = parentTx.vsize || parentTx.size;
      const parentFee = await this.calculateActualFee(request.parentTxid);
      const parentFeeRate = parentFee > 0
        ? Math.ceil((parentFee / parentSize) * 100) / 100
        : 0;

      const childSize = 110;
      const totalSize = parentSize + childSize;
      const totalFeeNeeded = Math.ceil(totalSize * request.targetFeeRate);
      const childFeeNeeded = Math.max(0, totalFeeNeeded - parentFee);

      const {
        detectedAnchorVout,
        resolvedVout,
        resolvedOutput,
        anchorValue,
        isAnchorOutput,
        usedAutoDetectedAnchor,
      } = resolveAnchorOutput(parentTx, request.anchorVout);

      if (!resolvedOutput) {
        throw new Error(
          detectedAnchorVout >= 0
            ? `Anchor output ${request.anchorVout} not found. Try output index ${detectedAnchorVout}.`
            : 'No 330-sat anchor output found on this transaction.'
        );
      }

      const feasible = isAnchorOutput && childFeeNeeded <= anchorValue;

      return {
        txid: request.parentTxid,
        parentSize,
        parentFee,
        parentFeeRate,
        childSize,
        totalSize,
        targetFeeRate: request.targetFeeRate,
        totalFeeNeeded,
        childFeeNeeded,
        anchorVout: resolvedVout,
        detectedAnchorVout,
        usedAutoDetectedAnchor,
        anchorValue,
        isAnchorOutput,
        feasible,
        additionalInputsNeeded: feasible
          ? 0
          : isAnchorOutput
            ? Math.max(0, childFeeNeeded - anchorValue)
            : childFeeNeeded,
      };
    } catch (error: any) {
      logger.error('Error estimating fee bump', {
        error: error.message,
        txid: request.parentTxid,
        anchorVout: request.anchorVout,
      });
      throw error;
    }
  }

  // Get wallet address for receiving change
  getWalletAddress(): string {
    return bitcoin.payments.p2wpkh({
      pubkey: this.walletKeyPair.publicKey,
      network: this.network,
    }).address!;
  }
}

export const cpfpService = new CPFPService();