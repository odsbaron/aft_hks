/**
 * Relayer Configuration
 * Centralized configuration management with environment variable support
 */

import { z } from 'zod';

// Environment variable schema validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string(),

  // RPC
  RPC_URL: z.string(),
  CHAIN_ID: z.string().transform(Number),

  // Relayer Wallet
  RELAYER_PRIVATE_KEY: z.string().min(1, 'RELAYER_PRIVATE_KEY is required'),

  // Contracts
  SIDEBET_FACTORY_ADDRESS: z.string().optional(),
  MOCK_TOKEN_ADDRESS: z.string().optional(),

  // Thresholds
  MIN_SIGNATURES_THRESHOLD: z.string().default('3').transform(Number),
  MAX_PROPOSAL_AGE_HOURS: z.string().default('24').transform(Number),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

// Validate and parse environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')} (${e.message})`).join('\n');
      throw new Error(`Missing or invalid environment variables:\n${missingVars}`);
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnv();

// Derived configuration
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';

// CORS origins array
export const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

// Contract ABIs (simplified - in production, import from actual contract artifacts)
export const SIDEDET_ABI = [
  // Read functions
  'function getInfo() external view returns (tuple(string topic, uint256 thresholdPercent, address token, uint256 totalParticipants, uint256 totalStaked, uint256 createdAt, uint256 proposedAt, uint256 resolvedAt) info)',
  'function getStatus() external view returns (uint8)',
  'function getProposal() external view returns (tuple(uint256 outcome, address proposer, uint256 attestationCount, uint256 disputeUntil, string ipfsHash) proposal)',
  'function getParticipant(address) external view returns (tuple(address wallet, uint256 stake, uint256 outcome, bool hasAttested) participant)',
  'function getParticipants() external view returns (tuple(address wallet, uint256 stake, uint256 outcome, bool hasAttested)[] memory)',

  // State-changing functions
  'function stake(uint256 outcome, uint256 amount) external',
  'function propose(uint256 outcome, string calldata ipfsHash) external',
  'function finalize(uint256[] calldata signatures, uint256[] calldata nonces, address[] calldata signers) external',
  'function dispute(string calldata reason) external',
  'function cancel() external',

  // Events
  'event Staked(address indexed user, uint256 outcome, uint256 amount)',
  'event Proposed(address indexed proposer, uint256 outcome, string ipfsHash)',
  'event Attested(address indexed signer, uint256 outcome)',
  'event Finalized(uint256 outcome)',
  'event Disputed(address indexed disputer, string reason)',
  'event Cancelled()',
] as const;

export const FACTORY_ABI = [
  'function createSidebet(string calldata topic, uint256 thresholdPercent, address token, uint256 minStake, bytes32 salt) external returns (address)',
  'function predictSidebetAddress(string calldata topic, uint256 thresholdPercent, address token, uint256 minStake, bytes32 salt) external view returns (address)',
  'function getMarkets() external view returns (address[] memory)',
  'function getMarketCount() external view returns (uint256)',
  'event SidebetCreated(address indexed market, address indexed creator, string topic)',
] as const;

// EIP-712 Domain
export const EIP712_DOMAIN = {
  name: 'Sidebet',
  version: '1',
  chainId: config.CHAIN_ID,
} as const;

// EIP-712 Types
export const EIP712_TYPES = {
  Attestation: [
    { name: 'market', type: 'address' },
    { name: 'outcome', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export default config;
