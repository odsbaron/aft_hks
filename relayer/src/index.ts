/**
 * Sidebets Relayer Service
 * Main entry point for the relayer backend
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { config } from './config';
import logger from './utils/logger';
import { ApiError } from './utils/errors';
import blockchain from './services/blockchain';
import finalizationService from './services/finalization';
import signatureService from './services/signature';
import db from './models/database';

// Routes
import attestationRoutes from './routes/attestations';
import marketRoutes from './routes/markets';
import healthRoutes from './routes/health';

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

// CORS configuration
app.use(cors({
  origin: config.ALLOWED_ORIGINS.split(','),
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// Stricter rate limit for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body && req.body.signer ? { ...req.body, signer: '***' } : req.body,
  });
  next();
});

// ============================================================================
// API Routes
// ============================================================================

// Health checks (no rate limit)
app.use('/health', healthRoutes);

// API v1 routes
app.use('/api/attestations', writeLimiter, attestationRoutes);
app.use('/api/markets', marketRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Sidebets Relayer Service',
    version: '1.0.0',
    description: 'Signature collection and auto-finalization service for Sidebets',
    endpoints: {
      health: '/health',
      attestations: '/api/attestations',
      markets: '/api/markets',
    },
    docs: 'https://github.com/sidebets/relayer',
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Not found',
      code: 'NOT_FOUND',
    },
  });
});

// Global error handler
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // Zod validation errors
  if (err && typeof err === 'object' && 'issues' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: (err as { issues: Array<{ path: string[]; message: string }> }).issues,
      },
    });
  }

  // Unknown errors
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
});

// ============================================================================
// Background Jobs
// ============================================================================

/**
 * Sync markets from blockchain
 * Runs every 5 minutes
 */
cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Running scheduled market sync...');

    // Get markets that need syncing
    const marketsNeedingSync = await signatureService.getMarketsNeedingSync();

    if (marketsNeedingSync.length > 0) {
      const { success, failed } = await signatureService.syncMarkets(marketsNeedingSync);
      logger.info(`Market sync complete`, {
        total: marketsNeedingSync.length,
        success: success.length,
        failed: failed.length,
      });
    } else {
      logger.debug('No markets need syncing');
    }

    // Also sync all markets from factory
    const factoryMarkets = await blockchain.getAllMarkets();
    const syncedAddresses = (await db.market.findMany({ select: { address: true } }))
      .map(m => m.address);

    const newMarkets = factoryMarkets.filter(addr => !syncedAddresses.includes(addr));

    if (newMarkets.length > 0) {
      logger.info(`Found ${newMarkets.length} new markets to sync`);
      await signatureService.syncMarkets(newMarkets);
    }
  } catch (error) {
    logger.error('Error in scheduled market sync', { error });
  }
});

/**
 * Check dispute windows and queue for finalization
 * Runs every 2 minutes
 */
cron.schedule('*/2 * * * *', async () => {
  try {
    const queued = await finalizationService.checkDisputeWindows();
    if (queued > 0) {
      logger.info(`Queued ${queued} markets for finalization`);
    }
  } catch (error) {
    logger.error('Error checking dispute windows', { error });
  }
});

/**
 * Process pending finalizations
 * Runs every minute
 */
cron.schedule('* * * * *', async () => {
  try {
    const result = await finalizationService.processPendingFinalizations();
    if (result.processed > 0) {
      logger.info(`Processed ${result.processed} finalizations`, {
        succeeded: result.succeeded,
        failed: result.failed,
      });
    }
  } catch (error) {
    logger.error('Error processing finalizations', { error });
  }
});

/**
 * Check for old proposals
 * Runs every hour
 */
cron.schedule('0 * * * *', async () => {
  try {
    const processed = await finalizationService.checkOldProposals();
    if (processed > 0) {
      logger.info(`Processed ${processed} old proposals`);
    }
  } catch (error) {
    logger.error('Error checking old proposals', { error });
  }
});

/**
 * Cleanup old logs
 * Runs daily at midnight
 */
cron.schedule('0 0 * * *', async () => {
  try {
    await db.cleanupOldLogs(30);
  } catch (error) {
    logger.error('Error cleaning up logs', { error });
  }
});

// ============================================================================
// Server Startup
// ============================================================================

async function startServer() {
  try {
    // Initialize blockchain
    logger.info('Initializing blockchain connection...');
    blockchain.initializeBlockchain();

    // Connect to database (Prisma auto-connects on first query)
    logger.info('Testing database connection...');
    await db.$connect();
    logger.info('Database connected');

    // Start Express server
    const server = app.listen(config.PORT, () => {
      logger.info(`Sidebets Relayer Service started on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Relayer address: ${blockchain.getRelayerAddress()}`);
      logger.info(`Chain ID: ${config.CHAIN_ID}`);

      if (config.SIDEBET_FACTORY_ADDRESS) {
        logger.info(`Factory address: ${config.SIDEBET_FACTORY_ADDRESS}`);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.$disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
