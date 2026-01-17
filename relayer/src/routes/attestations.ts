/**
 * Attestation Routes
 * API endpoints for signature submission and retrieval
 */

import { Router } from 'express';
import { z } from 'zod';
import signatureService from '../services/signature';
import db from '../models/database';
import logger from '../utils/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';

const router = Router();

/**
 * POST /api/attestations
 * Submit an EIP-712 attestation signature
 */
router.post('/', async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      market: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid market address'),
      signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature'),
      outcome: z.enum(['0', '1']).transform(Number),
      nonce: z.coerce.bigint(),
    });

    const data = schema.parse(req.body);

    // Get signer from signature (for now, we'll verify in the service)
    // In production, extract signer from the signature itself
    // For now, we'll require the signer to be passed in the body
    if (!req.body.signer) {
      throw new BadRequestError('signer address is required');
    }

    const result = await signatureService.submitAttestation({
      market: data.market,
      signature: data.signature,
      outcome: data.outcome,
      nonce: data.nonce,
      signerAddress: req.body.signer,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attestations
 * Get attestations for a market
 */
router.get('/', async (req, res, next) => {
  try {
    const schema = z.object({
      market: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      outcome: z.enum(['0', '1']).transform(Number).optional(),
    });

    const { market, outcome } = schema.parse(req.query);

    const result = await signatureService.getAttestations({ market, outcome });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attestations/:market
 * Get attestations for a specific market
 */
router.get('/:market', async (req, res, next) => {
  try {
    const { market } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(market)) {
      throw new BadRequestError('Invalid market address');
    }

    const outcome = req.query.outcome ?
      req.query.outcome === '0' ? 0 : 1 :
      undefined;

    const result = await signatureService.getAttestations({ market, outcome });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attestations/:market/count
 * Get attestation counts for a market
 */
router.get('/:market/count', async (req, res, next) => {
  try {
    const { market } = req.params;

    const [yesCount, noCount, total] = await Promise.all([
      db.countValidAttestations(market, 1),
      db.countValidAttestations(market, 0),
      db.attestation.count({
        where: { marketAddress: market, isValid: true },
      }),
    ]);

    const marketData = await db.getMarket(market);

    res.json({
      success: true,
      counts: {
        yes: yesCount,
        no: noCount,
        total,
      },
      threshold: marketData ? Number(marketData.thresholdPercent) : null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/attestations/:market
 * Clear attestations for a market (dev only)
 */
router.delete('/:market', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestError('Not allowed in production');
    }

    const { market } = req.params;

    await db.attestation.deleteMany({
      where: { marketAddress: market },
    });

    await db.finalizationQueue.delete({
      where: { marketAddress: market },
    });

    logger.info(`Cleared attestations for market ${market}`);

    res.json({
      success: true,
      message: 'Attestations cleared',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
