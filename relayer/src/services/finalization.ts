/**
 * Auto-Finalization Service
 * Background service that monitors markets and auto-finalizes when threshold is met
 */

import { config } from '../config';
import db from '../models/database';
import blockchain, { MarketStatus } from './blockchain';
import signatureService from './signature';
import logger from '../utils/logger';

// ============================================================================
// Finalization Check
// ============================================================================

/**
 * Check if a market is ready for finalization
 */
async function checkMarketReadyForFinalization(marketAddress: string): Promise<boolean> {
  const market = await db.getMarket(marketAddress);
  if (!market) return false;

  // Skip if already resolved or cancelled
  if (market.status === MarketStatus.Resolved ||
      market.status === MarketStatus.Cancelled) {
    return false;
  }

  const proposal = await db.getActiveProposal(marketAddress);
  if (!proposal) return false;

  // Check if dispute window is still active
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < BigInt(proposal.disputeUntil)) {
    logger.debug(`Market ${marketAddress} dispute window still active`);
    return false;
  }

  // Count attestations
  const signatureCount = await db.countValidAttestations(
    marketAddress,
    proposal.outcome
  );

  // Count eligible participants (those who staked on the proposed outcome)
  const totalParticipants = await db.participant.count({
    where: {
      marketAddress,
      outcome: proposal.outcome,
    },
  });

  // Calculate threshold
  const thresholdPercent = Number(market.thresholdPercent);
  const requiredSignatures = Math.ceil(
    (totalParticipants * thresholdPercent) / 100
  );

  // Must meet both the market threshold and the minimum configured threshold
  const isReady = signatureCount >= Math.max(
    requiredSignatures,
    config.MIN_SIGNATURES_THRESHOLD
  );

  logger.debug(`Finalization check for ${marketAddress}`, {
    signatureCount,
    totalParticipants,
    thresholdPercent,
    requiredSignatures,
    minThreshold: config.MIN_SIGNATURES_THRESHOLD,
    isReady,
  });

  return isReady;
}

/**
 * Process finalization for a single market
 */
async function processMarketFinalization(marketAddress: string): Promise<boolean> {
  try {
    // 1. Get latest market state
    const chainInfo = await blockchain.getMarketInfo(marketAddress);

    // Skip if already resolved
    if (chainInfo.status === MarketStatus.Resolved) {
      await db.markFinalizationCompleted(marketAddress);
      logger.info(`Market ${marketAddress} already resolved on-chain`);
      return true;
    }

    // 2. Get proposal and attestations
    const proposal = await db.getActiveProposal(marketAddress);
    if (!proposal) {
      logger.warn(`No active proposal for ${marketAddress}`);
      return false;
    }

    const attestations = await signatureService.getAttestationsForFinalization(
      marketAddress,
      proposal.outcome
    );

    if (attestations.count === 0) {
      logger.warn(`No attestations found for ${marketAddress}`);
      return false;
    }

    logger.info(`Finalizing market ${marketAddress}`, {
      outcome: proposal.outcome,
      signatureCount: attestations.count,
    });

    // 3. Submit transaction
    const receipt = await blockchain.finalizeMarket(
      marketAddress,
      attestations.signatures,
      attestations.nonces,
      attestations.signers
    );

    // 4. Update database
    await db.markFinalizationCompleted(marketAddress);

    // 5. Sync market state
    await signatureService.syncMarketFromBlockchain(marketAddress);

    logger.info(`Market ${marketAddress} finalized successfully`, {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });

    return true;
  } catch (error) {
    logger.error(`Failed to finalize market ${marketAddress}`, { error });
    await db.markFinalizationAttempted(
      marketAddress,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

/**
 * Check and finalize all pending markets
 */
export async function processPendingFinalizations(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  logger.info('Processing pending finalizations...');

  const pendingMarkets = await db.getPendingFinalizations();

  if (pendingMarkets.length === 0) {
    logger.debug('No pending finalizations');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of pendingMarkets) {
    try {
      const isReady = await checkMarketReadyForFinalization(item.marketAddress);

      if (isReady) {
        const success = await processMarketFinalization(item.marketAddress);
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
      } else {
        // Update last checked time
        await db.finalizationQueue.update({
          where: { marketAddress: item.marketAddress },
          data: { lastCheckedAt: new Date() },
        });
      }
    } catch (error) {
      logger.error(`Error checking market ${item.marketAddress}`, { error });
      failed++;
    }
  }

  logger.info('Finalization processing complete', {
    processed: pendingMarkets.length,
    succeeded,
    failed,
  });

  return { processed: pendingMarkets.length, succeeded, failed };
}

// ============================================================================
// Dispute Window Monitoring
// ============================================================================

/**
 * Check for markets where dispute window has expired
 * and queue them for finalization
 */
export async function checkDisputeWindows(): Promise<number> {
  logger.info('Checking dispute windows...');

  const now = BigInt(Math.floor(Date.now() / 1000));

  // Find proposals where dispute window has expired but not finalized
  const expiredProposals = await db.proposal.findMany({
    where: {
      isDisputed: false,
      disputeUntil: { lte: now.toString() },
    },
    include: {
      market: true,
    },
  });

  let queued = 0;

  for (const proposal of expiredProposals) {
    const market = proposal.market;

    // Skip if already resolved or cancelled
    if (market.status === MarketStatus.Resolved ||
        market.status === MarketStatus.Cancelled) {
      continue;
    }

    // Check if already in queue
    const existing = await db.finalizationQueue.findUnique({
      where: { marketAddress: market.address },
    });

    if (existing && existing.completedAt) {
      continue;
    }

    // Add to queue
    await db.addToFinalizationQueue(market.address);
    queued++;

    logger.info(`Market ${market.address} queued (dispute window expired)`, {
      outcome: proposal.outcome,
    });
  }

  if (queued > 0) {
    logger.info(`Queued ${queued} markets for finalization`);
  }

  return queued;
}

// ============================================================================
// Proposal Age Monitoring
// ============================================================================

/**
 * Check for old proposals that should be force-finalized
 */
export async function checkOldProposals(): Promise<number> {
  logger.info('Checking for old proposals...');

  const maxAgeMs = config.MAX_PROPOSAL_AGE_HOURS * 60 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - maxAgeMs);

  const oldProposals = await db.proposal.findMany({
    where: {
      isDisputed: false,
      createdAt: { lte: cutoffTime },
    },
    include: {
      market: {
        where: {
          status: MarketStatus.Proposed,
        },
      },
    },
  });

  let processed = 0;

  for (const proposal of oldProposals) {
    if (!proposal.market) continue;

    // Check if we have enough signatures to finalize
    const attestationCount = await db.attestation.count({
      where: {
        proposalId: proposal.id,
        isValid: true,
      },
    });

    if (attestationCount >= config.MIN_SIGNATURES_THRESHOLD) {
      await db.addToFinalizationQueue(proposal.marketAddress);
      processed++;
      logger.info(`Old proposal queued for finalization`, {
        market: proposal.marketAddress,
        ageHours: Math.floor((Date.now() - proposal.createdAt.getTime()) / (60 * 60 * 1000)),
      });
    } else {
      logger.warn(`Old proposal has insufficient signatures`, {
        market: proposal.marketAddress,
        attestationCount,
        minRequired: config.MIN_SIGNATURES_THRESHOLD,
      });
    }
  }

  return processed;
}

// ============================================================================
// Health Check
// ============================================================================

export async function getFinalizationHealth(): Promise<{
  pendingCount: number;
  readyCount: number;
  failedCount: number;
  recentSuccesses: number;
  recentFailures: number;
}> {
  const [pending, ready, failed, recentSuccesses, recentFailures] = await Promise.all([
    db.finalizationQueue.count({
      where: { completedAt: null },
    }),
    db.finalizationQueue.count({
      where: { completedAt: null, thresholdMet: true },
    }),
    db.finalizationQueue.count({
      where: { error: { not: null }, completedAt: null },
    }),
    db.finalizationQueue.count({
      where: {
        completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    db.finalizationQueue.count({
      where: {
        error: { not: null },
        attemptedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    pendingCount: pending,
    readyCount: ready,
    failedCount: failed,
    recentSuccesses,
    recentFailures,
  };
}

export default {
  processPendingFinalizations,
  checkDisputeWindows,
  checkOldProposals,
  getFinalizationHealth,
};
