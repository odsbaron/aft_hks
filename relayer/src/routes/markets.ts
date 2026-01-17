/**
 * Market Routes
 * API endpoints for market information and sync
 */

import { Router } from 'express';
import { z } from 'zod';
import signatureService from '../services/signature';
import db from '../models/database';
import blockchain from '../services/blockchain';
import logger from '../utils/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';

const router = Router();

/**
 * GET /api/markets
 * List all markets
 */
router.get('/', async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['0', '1', '2', '3', '4']).transform(Number).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    });

    const { status, limit, offset } = schema.parse(req.query);

    const { markets, total } = await db.listMarkets({ status, limit, offset });

    res.json({
      success: true,
      markets: markets.map(m => ({
        address: m.address,
        topic: m.topic,
        thresholdPercent: Number(m.thresholdPercent),
        token: m.token,
        totalParticipants: Number(m.totalParticipants),
        totalStaked: m.totalStaked.toString(),
        status: m.status,
        createdAt: m.createdAt,
        proposal: m.proposals[0] ? {
          outcome: m.proposals[0].outcome,
          attestationCount: Number(m.proposals[0].attestationCount),
          disputeUntil: m.proposals[0].disputeUntil.toString(),
          ipfsHash: m.proposals[0].ipfsHash,
        } : null,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/markets/:address
 * Get detailed market information
 */
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestError('Invalid market address');
    }

    let market = await db.getMarket(address);

    // If not in database, sync from blockchain
    if (!market) {
      logger.info(`Market ${address} not in database, syncing...`);
      await signatureService.syncMarketFromBlockchain(address);
      market = await db.getMarket(address);
    }

    if (!market) {
      throw new NotFoundError('Market not found');
    }

    // Get proposal
    const proposal = await db.getActiveProposal(address);

    // Get attestation counts
    const [yesCount, noCount] = await Promise.all([
      db.countValidAttestations(address, 1),
      db.countValidAttestations(address, 0),
    ]);

    res.json({
      success: true,
      market: {
        address: market.address,
        creator: market.creator,
        topic: market.topic,
        thresholdPercent: Number(market.thresholdPercent),
        token: market.token,
        totalParticipants: Number(market.totalParticipants),
        totalStaked: market.totalStaked.toString(),
        status: market.status,
        createdAt: market.createdAt,
        proposedAt: market.proposedAt,
        resolvedAt: market.resolvedAt,
        lastSyncedAt: market.lastSyncedAt,
      },
      proposal: proposal ? {
        id: proposal.id,
        outcome: proposal.outcome,
        proposer: proposal.proposerAddress,
        attestationCount: Number(proposal.attestationCount),
        disputeUntil: proposal.disputeUntil.toString(),
        ipfsHash: proposal.ipfsHash,
        isDisputed: proposal.isDisputed,
        createdAt: proposal.createdAt,
      } : null,
      attestations: {
        yes: yesCount,
        no: noCount,
        total: yesCount + noCount,
      },
      participants: market.participants.map(p => ({
        address: p.userAddress,
        stake: p.stake.toString(),
        outcome: p.outcome,
        hasAttested: p.hasAttested,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/markets/:address/sync
 * Manually trigger a market sync from blockchain
 */
router.post('/:address/sync', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestError('Invalid market address');
    }

    const result = await signatureService.syncMarketFromBlockchain(address);

    res.json({
      success: true,
      message: 'Market synced',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/markets/:address/participants
 * Get market participants
 */
router.get('/:address/participants', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestError('Invalid market address');
    }

    const participants = await db.participant.findMany({
      where: { marketAddress: address },
      include: { user: true },
    });

    res.json({
      success: true,
      participants: participants.map(p => ({
        address: p.userAddress,
        stake: p.stake.toString(),
        outcome: p.outcome,
        hasAttested: p.hasAttested,
      })),
      total: participants.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/markets/:address/proposal
 * Get active proposal for a market
 */
router.get('/:address/proposal', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestError('Invalid market address');
    }

    const proposal = await db.getActiveProposal(address);

    if (!proposal) {
      return res.json({
        success: true,
        proposal: null,
      });
    }

    const attestations = await db.attestation.findMany({
      where: {
        proposalId: proposal.id,
        isValid: true,
      },
      include: { signer: true },
    });

    res.json({
      success: true,
      proposal: {
        id: proposal.id,
        outcome: proposal.outcome,
        proposer: proposal.proposerAddress,
        attestationCount: Number(proposal.attestationCount),
        disputeUntil: proposal.disputeUntil.toString(),
        ipfsHash: proposal.ipfsHash,
        isDisputed: proposal.isDisputed,
        createdAt: proposal.createdAt,
        attestations: attestations.map(a => ({
          signer: a.signerAddress,
          signature: a.signature,
          submittedAt: a.submittedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/markets/predict-address
 * Predict market address using CREATE2
 */
router.post('/predict-address', async (req, res, next) => {
  try {
    const schema = z.object({
      topic: z.string().min(1),
      thresholdPercent: z.number().int().min(51).max(99),
      token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      minStake: z.string().regex(/^\d+$/),
      salt: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const address = await blockchain.predictMarketAddress({
      topic: data.topic,
      thresholdPercent: data.thresholdPercent,
      token: data.token,
      minStake: BigInt(data.minStake),
      salt: data.salt || '0x' + '0'.repeat(64),
    });

    res.json({
      success: true,
      address,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/markets/:address/status
 * Get market status from blockchain (live)
 */
router.get('/:address/status', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestError('Invalid market address');
    }

    const info = await blockchain.getMarketInfo(address);
    const proposal = await blockchain.getMarketProposal(address);

    const statusNames = ['Open', 'Proposed', 'Resolved', 'Disputed', 'Cancelled'];

    res.json({
      success: true,
      status: {
        value: info.status,
        name: statusNames[info.status] || 'Unknown',
      },
      info: {
        topic: info.topic,
        thresholdPercent: Number(info.thresholdPercent),
        totalParticipants: Number(info.totalParticipants),
        totalStaked: info.totalStaked.toString(),
        createdAt: new Date(Number(info.createdAt) * 1000).toISOString(),
        proposedAt: info.proposedAt > 0 ?
          new Date(Number(info.proposedAt) * 1000).toISOString() : null,
        resolvedAt: info.resolvedAt > 0 ?
          new Date(Number(info.resolvedAt) * 1000).toISOString() : null,
      },
      proposal: proposal ? {
        outcome: proposal.outcome,
        proposer: proposal.proposer,
        attestationCount: proposal.attestationCount,
        disputeUntil: new Date(Number(proposal.disputeUntil) * 1000).toISOString(),
        ipfsHash: proposal.ipfsHash,
      } : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
