/**
 * Signature Collection Service
 * Handles EIP-712 attestation signature collection and validation
 */

import { config } from '../config';
import db from '../models/database';
import blockchain, { validateAttestationSignature } from './blockchain';
import logger from '../utils/logger';
import { ConflictError, BadRequestError, NotFoundError, SignatureValidationError } from '../utils/errors';

// ============================================================================
// Signature Submission
// ============================================================================

export interface SubmitAttestationParams {
  market: string;
  signature: string;
  outcome: number;
  nonce: bigint;
  signerAddress: string;
}

/**
 * Submit an attestation signature
 */
export async function submitAttestation(params: SubmitAttestationParams) {
  const { market, signature, outcome, nonce, signerAddress } = params;

  // 1. Validate signature format and recover signer
  const isValidSignature = await validateAttestationSignature(
    signature,
    signerAddress,
    market,
    outcome,
    nonce
  );

  if (!isValidSignature) {
    throw new SignatureValidationError('Invalid signature or signer mismatch');
  }

  // 2. Check if market exists in our database
  const marketData = await db.getMarket(market);
  if (!marketData) {
    // Sync from blockchain
    logger.info(`Market ${market} not found in database, syncing from blockchain...`);
    await syncMarketFromBlockchain(market);
  }

  // 3. Check if user is a participant
  const participant = await db.participant.findFirst({
    where: {
      marketAddress: market,
      userAddress: signerAddress,
    },
  });

  if (!participant) {
    throw new BadRequestError('User is not a participant in this market');
  }

  // 4. Verify user staked on the proposed outcome
  if (participant.outcome !== outcome) {
    throw new BadRequestError('User did not stake on this outcome');
  }

  // 5. Check for duplicate attestation
  const existing = await db.attestation.findFirst({
    where: {
      marketAddress: market,
      signerAddress,
      nonce: nonce.toString(),
      isValid: true,
    },
  });

  if (existing) {
    throw new ConflictError('Attestation already submitted for this nonce');
  }

  // 6. Get active proposal
  const activeProposal = await db.getActiveProposal(market);
  if (!activeProposal) {
    throw new BadRequestError('No active proposal for this market');
  }

  if (activeProposal.outcome !== outcome) {
    throw new BadRequestError('Outcome does not match active proposal');
  }

  // 7. Store attestation
  const attestation = await db.createAttestation({
    marketAddress: market,
    signerAddress,
    outcome,
    signature,
    nonce,
    proposalId: activeProposal.id,
  });

  // 8. Update attestation count in proposal
  const count = await db.attestation.count({
    where: {
      marketAddress: market,
      proposalId: activeProposal.id,
      isValid: true,
    },
  });

  await db.proposal.update({
    where: { id: activeProposal.id },
    data: { attestationCount: BigInt(count) },
  });

  // 9. Add to finalization queue if threshold might be met
  await checkAndQueueForFinalization(market);

  logger.info(`Attestation submitted`, {
    market,
    signer: signerAddress,
    outcome,
    nonce,
    totalCount: count,
  });

  return {
    success: true,
    attestation: {
      id: attestation.id,
      market: attestation.marketAddress,
      signer: attestation.signerAddress,
      outcome: attestation.outcome,
      submittedAt: attestation.submittedAt,
    },
    stats: {
      totalAttestations: count,
      totalParticipants: await db.participant.count({
        where: { marketAddress: market, outcome },
      }),
    },
  };
}

// ============================================================================
// Signature Retrieval
// ============================================================================

export interface GetAttestationsParams {
  market: string;
  outcome?: number;
}

export async function getAttestations(params: GetAttestationsParams) {
  const { market, outcome } = params;

  const attestations = await db.getAttestations(market, outcome);

  return {
    success: true,
    attestations: attestations.map(a => ({
      id: a.id,
      market: a.marketAddress,
      signer: a.signerAddress,
      outcome: a.outcome,
      nonce: a.nonce,
      submittedAt: a.submittedAt,
    })),
    count: attestations.length,
  };
}

/**
 * Get attestations formatted for contract finalization
 */
export async function getAttestationsForFinalization(marketAddress: string, outcome: number) {
  const attestations = await db.getAttestationsForFinalization(marketAddress, outcome);

  return {
    signatures: attestations.map(a => a.signature),
    nonces: attestations.map(a => BigInt(a.nonce)),
    signers: attestations.map(a => a.signerAddress),
    count: attestations.length,
  };
}

// ============================================================================
// Market Sync
// ============================================================================

/**
 * Sync market data from blockchain
 */
export async function syncMarketFromBlockchain(marketAddress: string) {
  try {
    const [info, proposal, participants] = await Promise.all([
      blockchain.getMarketInfo(marketAddress),
      blockchain.getMarketProposal(marketAddress).catch(() => null),
      blockchain.getMarketParticipants(marketAddress).catch(() => []),
    ]);

    // Upsert market
    await db.upsertMarket({
      address: marketAddress,
      creator: '', // Will be filled from first participant or factory
      topic: info.topic,
      thresholdPercent: info.thresholdPercent,
      token: info.token,
      totalParticipants: info.totalParticipants,
      totalStaked: info.totalStaked,
      status: info.status,
      createdAt: info.createdAt,
      proposedAt: info.proposedAt,
      resolvedAt: info.resolvedAt,
    });

    // Sync proposal if exists
    if (proposal) {
      const existingProposal = await db.proposal.findFirst({
        where: { marketAddress, isDisputed: false },
      });

      if (!existingProposal) {
        await db.createProposal({
          marketAddress,
          proposerAddress: proposal.proposer,
          outcome: proposal.outcome,
          disputeUntil: proposal.disputeUntil,
          ipfsHash: proposal.ipfsHash,
        });
      }
    }

    // Sync participants
    for (const participant of participants) {
      await db.upsertParticipant({
        marketAddress,
        userAddress: participant.wallet,
        stake: participant.stake,
        outcome: participant.outcome,
        hasAttested: participant.hasAttested,
      });
    }

    await db.logSyncOperation({
      operation: 'sync_market',
      marketAddress,
      status: 'success',
    });

    logger.info(`Market ${marketAddress} synced from blockchain`);
    return info;
  } catch (error) {
    await db.logSyncOperation({
      operation: 'sync_market',
      marketAddress,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// Finalization Queue
// ============================================================================

/**
 * Check if market meets threshold and queue for finalization
 */
async function checkAndQueueForFinalization(marketAddress: string) {
  const market = await db.getMarket(marketAddress);
  if (!market) return;

  const proposal = await db.getActiveProposal(marketAddress);
  if (!proposal) return;

  const signatureCount = await db.countValidAttestations(marketAddress, proposal.outcome);
  const totalParticipants = await db.participant.count({
    where: {
      marketAddress,
      outcome: proposal.outcome,
    },
  });

  // Calculate threshold
  const thresholdPercent = Number(market.thresholdPercent);
  const requiredSignatures = Math.ceil((totalParticipants * thresholdPercent) / 100);

  logger.debug(`Checking finalization threshold for ${marketAddress}`, {
    signatureCount,
    totalParticipants,
    thresholdPercent,
    requiredSignatures,
  });

  if (signatureCount >= Math.max(requiredSignatures, config.MIN_SIGNATURES_THRESHOLD)) {
    await db.addToFinalizationQueue(marketAddress);
    logger.info(`Market ${marketAddress} queued for finalization`);
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get markets that need syncing
 */
export async function getMarketsNeedingSync(): Promise<string[]> {
  const staleMarkets = await db.market.findMany({
    where: {
      lastSyncedAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes
      },
    },
    select: { address: true },
  });

  return staleMarkets.map(m => m.address);
}

/**
 * Sync multiple markets
 */
export async function syncMarkets(marketAddress: string[]): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const address of marketAddress) {
    try {
      await syncMarketFromBlockchain(address);
      success.push(address);
    } catch (error) {
      logger.error(`Failed to sync market ${address}`, { error });
      failed.push(address);
    }
  }

  return { success, failed };
}

export default {
  submitAttestation,
  getAttestations,
  getAttestationsForFinalization,
  syncMarketFromBlockchain,
  getMarketsNeedingSync,
  syncMarkets,
};
