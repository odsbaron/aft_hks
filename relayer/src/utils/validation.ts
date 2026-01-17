/**
 * Validation Utilities
 * Zod schemas for request validation
 */

import { z } from 'zod';

// Address validation
export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// Signature validation
export const signatureSchema = z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid ECDSA signature');

// IPFS hash validation
export const ipfsHashSchema = z.string().regex(/^Qm[a-z0-9]{44,}$/, 'Invalid IPFS hash');

// Market status enum
export const marketStatusSchema = z.enum(['0', '1', '2', '3', '4']).transform(Number);

// Outcome enum
export const outcomeSchema = z.enum(['0', '1']).transform(Number);

// ============================================================================
// Request Schemas
// ============================================================================

// Submit attestation
export const submitAttestationSchema = z.object({
  market: addressSchema,
  signature: signatureSchema,
  outcome: outcomeSchema,
  nonce: z.coerce.bigint(),
});

// Get attestations
export const getAttestationsSchema = z.object({
  market: addressSchema,
  outcome: outcomeSchema.optional(),
});

// Create market
export const createMarketSchema = z.object({
  topic: z.string().min(10, 'Topic must be at least 10 characters').max(500),
  thresholdPercent: z.number().int().min(51).max(99),
  token: addressSchema,
  minStake: z.string().regex(/^\d+$/, 'Min stake must be a positive integer'),
  salt: z.string().optional(),
});

// Get market
export const getMarketSchema = z.object({
  address: addressSchema,
});

// List markets
export const listMarketsSchema = z.object({
  status: marketStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Submit proposal
export const submitProposalSchema = z.object({
  market: addressSchema,
  outcome: outcomeSchema,
  ipfsHash: ipfsHashSchema,
});

// Submit dispute
export const submitDisputeSchema = z.object({
  market: addressSchema,
  proposalId: z.string().cuid(),
  reason: z.string().min(10).max(1000).optional(),
  evidenceIpfsHash: ipfsHashSchema.optional(),
});

// Sync market
export const syncMarketSchema = z.object({
  address: addressSchema,
});

// ============================================================================
// Response Types
// ============================================================================

export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.literal(true),
  data: dataSchema,
});

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SubmitAttestationRequest = z.infer<typeof submitAttestationSchema>;
export type GetAttestationsRequest = z.infer<typeof getAttestationsSchema>;
export type CreateMarketRequest = z.infer<typeof createMarketSchema>;
export type GetMarketRequest = z.infer<typeof getMarketSchema>;
export type ListMarketsRequest = z.infer<typeof listMarketsSchema>;
export type SubmitProposalRequest = z.infer<typeof submitProposalSchema>;
export type SubmitDisputeRequest = z.infer<typeof submitDisputeSchema>;
export type SyncMarketRequest = z.infer<typeof syncMarketSchema>;
