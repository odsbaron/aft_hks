/**
 * Blockchain Service
 * Handles all interactions with smart contracts
 */

import { ethers } from 'ethers';
import { config, SIDEDET_ABI, FACTORY_ABI } from '../config';
import { ContractCallError } from '../utils/errors';
import logger from '../utils/logger';
import db from '../models/database';

// Market Status Enum
export enum MarketStatus {
  Open = 0,
  Proposed = 1,
  Resolved = 2,
  Disputed = 3,
  Cancelled = 4,
}

// Initialize provider and wallet
let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let factory: ethers.Contract;
let relayerAddress: string;

export function initializeBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(config.RPC_URL);
    wallet = new ethers.Wallet(config.RELAYER_PRIVATE_KEY, provider);
    relayerAddress = wallet.address;

    // Initialize factory contract if address is configured
    if (config.SIDEBET_FACTORY_ADDRESS) {
      factory = new ethers.Contract(
        config.SIDEBET_FACTORY_ADDRESS,
        FACTORY_ABI,
        wallet
      );
      logger.info(`Factory contract initialized at ${config.SIDEBET_FACTORY_ADDRESS}`);
    }

    logger.info(`Blockchain service initialized. Relayer address: ${relayerAddress}`);
  } catch (error) {
    logger.error('Failed to initialize blockchain service', { error });
    throw error;
  }
}

// ============================================================================
// Market Operations
// ============================================================================

/**
 * Get market information from blockchain
 */
export async function getMarketInfo(marketAddress: string) {
  try {
    const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, provider);
    const info = await contract.getInfo();
    const status = await contract.getStatus();

    return {
      address: marketAddress,
      topic: info.topic,
      thresholdPercent: BigInt(info.thresholdPercent),
      token: info.token,
      totalParticipants: BigInt(info.totalParticipants),
      totalStaked: BigInt(info.totalStaked),
      createdAt: BigInt(info.createdAt),
      proposedAt: BigInt(info.proposedAt),
      resolvedAt: BigInt(info.resolvedAt),
      status: Number(status),
    };
  } catch (error) {
    logger.error(`Failed to get market info for ${marketAddress}`, { error });
    throw new ContractCallError('Failed to get market info', error);
  }
}

/**
 * Get proposal from blockchain
 */
export async function getMarketProposal(marketAddress: string) {
  try {
    const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, provider);
    const proposal = await contract.getProposal();

    // Return null if no proposal (attestationCount is 0)
    if (proposal.attestationCount === 0n) {
      return null;
    }

    return {
      outcome: Number(proposal.outcome),
      proposer: proposal.proposer,
      attestationCount: Number(proposal.attestationCount),
      disputeUntil: BigInt(proposal.disputeUntil),
      ipfsHash: proposal.ipfsHash,
    };
  } catch (error) {
    logger.error(`Failed to get proposal for ${marketAddress}`, { error });
    throw new ContractCallError('Failed to get proposal', error);
  }
}

/**
 * Get all participants from blockchain
 */
export async function getMarketParticipants(marketAddress: string) {
  try {
    const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, provider);
    const participants = await contract.getParticipants();

    return participants.map((p: any) => ({
      wallet: p.wallet,
      stake: BigInt(p.stake),
      outcome: Number(p.outcome),
      hasAttested: p.hasAttested,
    }));
  } catch (error) {
    logger.error(`Failed to get participants for ${marketAddress}`, { error });
    throw new ContractCallError('Failed to get participants', error);
  }
}

/**
 * Get specific participant info
 */
export async function getParticipantInfo(marketAddress: string, userAddress: string) {
  try {
    const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, provider);
    const participant = await contract.getParticipant(userAddress);

    return {
      wallet: participant.wallet,
      stake: BigInt(participant.stake),
      outcome: Number(participant.outcome),
      hasAttested: participant.hasAttested,
    };
  } catch (error) {
    logger.error(`Failed to get participant info for ${userAddress}`, { error });
    throw new ContractCallError('Failed to get participant info', error);
  }
}

// ============================================================================
// State-Changing Operations
// ============================================================================

/**
 * Finalize a market with collected signatures
 */
export async function finalizeMarket(
  marketAddress: string,
  signatures: string[],
  nonces: bigint[],
  signers: string[]
) {
  try {
    const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, wallet);

    // Convert bigint arrays to strings for ethers
    const nonceStrings = nonces.map(n => n.toString());

    logger.info(`Finalizing market ${marketAddress}`, {
      signatureCount: signatures.length,
    });

    // Call finalize function
    const tx = await contract.finalize(signatures, nonceStrings, signers);

    logger.info(`Transaction submitted: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    await db.logSyncOperation({
      operation: 'finalize',
      marketAddress,
      status: 'success',
      message: `Finalized with ${signatures.length} signatures`,
      data: JSON.stringify({ txHash: receipt.hash, blockNumber: receipt.blockNumber }),
    });

    return receipt;
  } catch (error) {
    logger.error(`Failed to finalize market ${marketAddress}`, { error });
    await db.logSyncOperation({
      operation: 'finalize',
      marketAddress,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new ContractCallError('Failed to finalize market', error);
  }
}

/**
 * Submit a dispute (relayer can do this on behalf of users)
 */
export async function submitDispute(marketAddress: string, reason: string) {
  try {
    const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, wallet);

    logger.info(`Submitting dispute for market ${marketAddress}`, { reason });

    const tx = await contract.dispute(reason);
    const receipt = await tx.wait();

    await db.logSyncOperation({
      operation: 'dispute',
      marketAddress,
      status: 'success',
      message: `Dispute submitted: ${reason}`,
      data: JSON.stringify({ txHash: receipt.hash }),
    });

    return receipt;
  } catch (error) {
    logger.error(`Failed to submit dispute for ${marketAddress}`, { error });
    throw new ContractCallError('Failed to submit dispute', error);
  }
}

// ============================================================================
// Factory Operations
// ============================================================================

/**
 * Get all markets from factory
 */
export async function getAllMarkets(): Promise<string[]> {
  try {
    if (!factory) {
      logger.warn('Factory contract not configured');
      return [];
    }

    const markets = await factory.getMarkets();
    return markets;
  } catch (error) {
    logger.error('Failed to get markets from factory', { error });
    throw new ContractCallError('Failed to get markets', error);
  }
}

/**
 * Get market count from factory
 */
export async function getMarketCount(): Promise<number> {
  try {
    if (!factory) {
      return 0;
    }

    const count = await factory.getMarketCount();
    return Number(count);
  } catch (error) {
    logger.error('Failed to get market count', { error });
    throw new ContractCallError('Failed to get market count', error);
  }
}

/**
 * Predict market address (CREATE2)
 */
export async function predictMarketAddress(params: {
  topic: string;
  thresholdPercent: number;
  token: string;
  minStake: bigint;
  salt: string;
}) {
  try {
    if (!factory) {
      throw new Error('Factory contract not configured');
    }

    const address = await factory.predictSidebetAddress(
      params.topic,
      params.thresholdPercent,
      params.token,
      params.minStake,
      params.salt
    );

    return address;
  } catch (error) {
    logger.error('Failed to predict market address', { error });
    throw new ContractCallError('Failed to predict market address', error);
  }
}

// ============================================================================
// Event Listening
// ============================================================================

/**
 * Start listening to market events
 */
export function startEventListener(marketAddress: string, callback: (event: any) => void) {
  const contract = new ethers.Contract(marketAddress, SIDEDET_ABI, provider);

  // Staked event
  contract.on('Staked', (user, outcome, amount) => {
    logger.debug(`Staked event`, { market: marketAddress, user, outcome, amount: amount.toString() });
    callback({ type: 'Staked', market: marketAddress, user, outcome: Number(outcome), amount: amount.toString() });
  });

  // Proposed event
  contract.on('Proposed', (proposer, outcome, ipfsHash) => {
    logger.info(`Proposed event`, { market: marketAddress, proposer, outcome: Number(outcome), ipfsHash });
    callback({ type: 'Proposed', market: marketAddress, proposer, outcome: Number(outcome), ipfsHash });
  });

  // Attested event
  contract.on('Attested', (signer, outcome) => {
    logger.debug(`Attested event`, { market: marketAddress, signer, outcome: Number(outcome) });
    callback({ type: 'Attested', market: marketAddress, signer, outcome: Number(outcome) });
  });

  // Finalized event
  contract.on('Finalized', (outcome) => {
    logger.info(`Finalized event`, { market: marketAddress, outcome: Number(outcome) });
    callback({ type: 'Finalized', market: marketAddress, outcome: Number(outcome) });
  });

  // Disputed event
  contract.on('Disputed', (disputer, reason) => {
    logger.info(`Disputed event`, { market: marketAddress, disputer, reason });
    callback({ type: 'Disputed', market: marketAddress, disputer, reason });
  });

  // Cancelled event
  contract.on('Cancelled', () => {
    logger.info(`Cancelled event`, { market: marketAddress });
    callback({ type: 'Cancelled', market: marketAddress });
  });

  logger.info(`Started listening to events for ${marketAddress}`);
}

// ============================================================================
// Signature Validation
// ============================================================================

/**
 * Validate EIP-712 signature
 */
export async function validateAttestationSignature(
  signature: string,
  signerAddress: string,
  marketAddress: string,
  outcome: number,
  nonce: bigint
): Promise<boolean> {
  try {
    // Recover signer from signature
    const domain = {
      name: 'Sidebet',
      version: '1',
      chainId: config.CHAIN_ID,
      verifyingContract: marketAddress,
    };

    const types = {
      Attestation: [
        { name: 'market', type: 'address' },
        { name: 'outcome', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ],
    };

    const value = {
      market: marketAddress,
      outcome: BigInt(outcome),
      nonce: nonce,
    };

    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);

    return recoveredAddress.toLowerCase() === signerAddress.toLowerCase();
  } catch (error) {
    logger.error('Signature validation failed', { error });
    return false;
  }
}

// ============================================================================
// Utilities
// ============================================================================

export function getRelayerAddress(): string {
  return relayerAddress;
}

export function getProvider(): ethers.JsonRpcProvider {
  return provider;
}

export function getWallet(): ethers.Wallet {
  return wallet;
}

export default {
  initializeBlockchain,
  getMarketInfo,
  getMarketProposal,
  getMarketParticipants,
  getParticipantInfo,
  finalizeMarket,
  submitDispute,
  getAllMarkets,
  getMarketCount,
  predictMarketAddress,
  startEventListener,
  validateAttestationSignature,
  getRelayerAddress,
  getProvider,
  getWallet,
};
