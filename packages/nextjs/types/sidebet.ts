/**
 * Type definitions for Sidebet contracts
 */

// Market Status Enum
export enum MarketStatus {
  Open = 0,
  Proposed = 1,
  Resolved = 2,
  Disputed = 3,
  Cancelled = 4,
}

// Outcome Enum
export enum Outcome {
  No = 0,
  Yes = 1,
}

// Market Info Struct
export interface MarketInfo {
  topic: string;
  thresholdPercent: bigint;
  token: string;
  totalParticipants: bigint;
  totalStaked: bigint;
  createdAt: bigint;
  proposedAt: bigint;
  resolvedAt: bigint;
}

// Participant Struct
export interface Participant {
  wallet: string;
  stake: bigint;
  outcome: bigint;
  hasAttested: boolean;
}

// Proposal Struct
export interface Proposal {
  outcome: bigint;
  proposer: string;
  attestationCount: bigint;
  disputeUntil: bigint;
  ipfsHash: string;
}

// Extended Market Data (for UI)
export interface MarketData {
  address: string;
  info: MarketInfo;
  status: MarketStatus;
  proposal?: Proposal;
  participants: Participant[];
  progress: number; // 0-100
}

// User stake info
export interface UserStakeInfo {
  hasStaked: boolean;
  stake: bigint;
  outcome: bigint;
  hasAttested: boolean;
}

// Create market form data
export interface CreateMarketFormData {
  topic: string;
  thresholdPercent: number;
  tokenAddress: string;
  minStake: string;
  salt?: string;
}

// Filter options for market list
export interface MarketFilters {
  status?: MarketStatus;
  searchQuery?: string;
  sortBy?: "createdAt" | "totalStaked" | "participants";
  sortOrder?: "asc" | "desc";
}
