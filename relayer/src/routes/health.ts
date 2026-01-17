/**
 * Health and Status Routes
 * API endpoints for monitoring the relayer service
 */

import { Router } from 'express';
import finalizationService from '../services/finalization';
import db from '../models/database';
import blockchain from '../services/blockchain';
import { config } from '../config';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/detailed
 * Detailed health status
 */
router.get('/detailed', async (req, res) => {
  try {
    // Check database connection
    const marketCount = await db.market.count();
    const attestationCount = await db.attestation.count();

    // Get finalization health
    const finalizationHealth = await finalizationService.getFinalizationHealth();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.NODE_ENV,
      services: {
        database: {
          status: 'connected',
          markets: marketCount,
          attestations: attestationCount,
        },
        blockchain: {
          status: 'connected',
          relayerAddress: blockchain.getRelayerAddress(),
          chainId: config.CHAIN_ID,
          rpcUrl: config.RPC_URL,
        },
        finalization: finalizationHealth,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/metrics
 * Metrics for monitoring
 */
router.get('/metrics', async (req, res) => {
  try {
    const [marketsByStatus, recentSyncs, pendingFinalizations] = await Promise.all([
      db.market.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.syncLog.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.finalizationQueue.count({
        where: { completedAt: null },
      }),
    ]);

    const statusCounts = marketsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<number, number>);

    res.json({
      timestamp: new Date().toISOString(),
      metrics: {
        markets: {
          total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
          byStatus: statusCounts,
        },
        attestations: await db.attestation.count(),
        participants: await db.participant.count(),
        pendingFinalizations,
      },
      recentActivity: recentSyncs.map(log => ({
        operation: log.operation,
        status: log.status,
        marketAddress: log.marketAddress,
        timestamp: log.createdAt,
      })),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/queue
 * Get finalization queue status
 */
router.get('/queue', async (req, res) => {
  try {
    const queue = await db.finalizationQueue.findMany({
      where: { completedAt: null },
      orderBy: { lastCheckedAt: 'asc' },
      include: {
        market: true,
      },
      take: 50,
    });

    res.json({
      success: true,
      queue: queue.map(item => ({
        marketAddress: item.marketAddress,
        marketTopic: item.market?.topic,
        signatureCount: item.signatureCount,
        totalParticipants: item.totalParticipants,
        proposalOutcome: item.proposalOutcome,
        lastCheckedAt: item.lastCheckedAt,
        attemptedAt: item.attemptedAt,
        error: item.error,
      })),
      count: queue.length,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
