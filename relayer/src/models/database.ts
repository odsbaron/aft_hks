/**
 * Database Service
 * Prisma client wrapper with custom queries and utilities
 */

import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';

// Extend Prisma Client with custom logging
class DatabaseService extends PrismaClient {
  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as any, (e: any) => {
        logger.debug(`Query: ${e.query}`, { duration: `${e.duration}ms` });
      });
    }
  }

  // ============================================================================
  // Market Operations
  // ============================================================================

  async upsertMarket(data: {
    address: string;
    creator: string;
    topic: string;
    thresholdPercent: bigint;
    token: string;
    totalParticipants: bigint;
    totalStaked: bigint;
    status: number;
    createdAt: bigint;
    proposedAt?: bigint;
    resolvedAt?: bigint;
  }) {
    return this.market.upsert({
      where: { address: data.address },
      update: {
        status: data.status,
        totalParticipants: data.totalParticipants.toString(),
        totalStaked: data.totalStaked.toString(),
        proposedAt: data.proposedAt || 0,
        resolvedAt: data.resolvedAt || 0,
        lastSyncedAt: new Date(),
      },
      create: {
        address: data.address,
        creator: data.creator,
        topic: data.topic,
        thresholdPercent: data.thresholdPercent.toString(),
        token: data.token,
        totalParticipants: data.totalParticipants.toString(),
        totalStaked: data.totalStaked.toString(),
        status: data.status,
        createdAt: data.createdAt.toString(),
        proposedAt: (data.proposedAt || 0).toString(),
        resolvedAt: (data.resolvedAt || 0).toString(),
      },
    });
  }

  async getMarket(address: string) {
    return this.market.findUnique({
      where: { address },
      include: {
        participants: true,
        proposals: {
          include: {
            attestations: true,
            disputes: true,
          },
        },
      },
    });
  }

  async listMarkets(options: { status?: number; limit?: number; offset?: number }) {
    const where: Prisma.MarketWhereInput = {};
    if (options.status !== undefined) {
      where.status = options.status;
    }

    const [markets, total] = await Promise.all([
      this.market.findMany({
        where,
        take: options.limit || 20,
        skip: options.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: true,
          proposals: {
            where: { isDisputed: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.market.count({ where }),
    ]);

    return { markets, total };
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async getOrCreateUser(address: string) {
    return this.user.upsert({
      where: { address },
      update: {},
      create: { address },
    });
  }

  // ============================================================================
  // Participant Operations
  // ============================================================================

  async upsertParticipant(data: {
    marketAddress: string;
    userAddress: string;
    stake: bigint;
    outcome: number;
    hasAttested?: boolean;
  }) {
    // Ensure user exists
    await this.getOrCreateUser(data.userAddress);

    return this.participant.upsert({
      where: {
        marketAddress_userAddress: {
          marketAddress: data.marketAddress,
          userAddress: data.userAddress,
        },
      },
      update: {
        stake: data.stake.toString(),
        outcome: data.outcome,
        hasAttested: data.hasAttested || false,
      },
      create: {
        marketId: '', // Will be linked after market exists
        marketAddress: data.marketAddress,
        userAddress: data.userAddress,
        stake: data.stake.toString(),
        outcome: data.outcome,
        hasAttested: data.hasAttested || false,
      },
    });
  }

  // ============================================================================
  // Attestation Operations
  // ============================================================================

  async createAttestation(data: {
    marketAddress: string;
    signerAddress: string;
    outcome: number;
    signature: string;
    nonce: bigint;
    proposalId?: string;
  }) {
    // Ensure user exists
    await this.getOrCreateUser(data.signerAddress);

    return this.attestation.create({
      data: {
        marketId: '',
        marketAddress: data.marketAddress,
        proposalId: data.proposalId,
        signerAddress: data.signerAddress,
        outcome: data.outcome,
        signature: data.signature,
        nonce: data.nonce.toString(),
      },
    });
  }

  async getAttestations(marketAddress: string, outcome?: number) {
    const where: Prisma.AttestationWhereInput = {
      marketAddress,
      isValid: true,
    };
    if (outcome !== undefined) {
      where.outcome = outcome;
    }

    return this.attestation.findMany({
      where,
      include: {
        signer: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async getAttestationsForFinalization(marketAddress: string, outcome: number) {
    return this.attestation.findMany({
      where: {
        marketAddress,
        outcome,
        isValid: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async invalidateAttestation(id: string) {
    return this.attestation.update({
      where: { id },
      data: { isValid: false },
    });
  }

  async countValidAttestations(marketAddress: string, outcome: number) {
    return this.attestation.count({
      where: {
        marketAddress,
        outcome,
        isValid: true,
      },
    });
  }

  // ============================================================================
  // Proposal Operations
  // ============================================================================

  async createProposal(data: {
    marketAddress: string;
    proposerAddress: string;
    outcome: number;
    disputeUntil: bigint;
    ipfsHash: string;
  }) {
    // Ensure user exists
    await this.getOrCreateUser(data.proposerAddress);

    return this.proposal.create({
      data: {
        marketId: '',
        marketAddress: data.marketAddress,
        proposerAddress: data.proposerAddress,
        outcome: data.outcome,
        disputeUntil: data.disputeUntil.toString(),
        ipfsHash: data.ipfsHash,
      },
    });
  }

  async getActiveProposal(marketAddress: string) {
    return this.proposal.findFirst({
      where: {
        marketAddress,
        isDisputed: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        attestations: {
          where: { isValid: true },
        },
        disputes: {
          where: { isActive: true },
        },
      },
    });
  }

  // ============================================================================
  // Finalization Queue Operations
  // ============================================================================

  async addToFinalizationQueue(marketAddress: string) {
    const market = await this.getMarket(marketAddress);
    if (!market) return null;

    const proposal = await this.getActiveProposal(marketAddress);
    if (!proposal) return null;

    const signatureCount = await this.countValidAttestations(marketAddress, proposal.outcome);
    const totalParticipants = await this.participant.count({
      where: {
        marketAddress,
        outcome: proposal.outcome,
      },
    });

    return this.finalizationQueue.upsert({
      where: { marketAddress },
      update: {
        signatureCount,
        totalParticipants,
        lastCheckedAt: new Date(),
      },
      create: {
        marketAddress,
        signatureCount,
        totalParticipants,
        proposalOutcome: proposal.outcome,
      },
    });
  }

  async getPendingFinalizations() {
    return this.finalizationQueue.findMany({
      where: {
        thresholdMet: false,
        completedAt: null,
      },
      orderBy: { lastCheckedAt: 'asc' },
    });
  }

  async markFinalizationAttempted(marketAddress: string, error?: string) {
    return this.finalizationQueue.update({
      where: { marketAddress },
      data: {
        attemptedAt: new Date(),
        error,
      },
    });
  }

  async markFinalizationCompleted(marketAddress: string) {
    return this.finalizationQueue.update({
      where: { marketAddress },
      data: {
        completedAt: new Date(),
        thresholdMet: true,
        error: null,
      },
    });
  }

  // ============================================================================
  // Sync Log Operations
  // ============================================================================

  async logSyncOperation(data: {
    operation: string;
    marketAddress?: string;
    status: 'success' | 'error' | 'pending';
    message?: string;
    data?: string;
  }) {
    return this.syncLog.create({
      data,
    });
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  async cleanupOldLogs(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.syncLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    logger.info(`Cleaned up ${result.count} old sync logs`);
    return result;
  }
}

// Export singleton instance
export const db = new DatabaseService();

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
});

export default db;
