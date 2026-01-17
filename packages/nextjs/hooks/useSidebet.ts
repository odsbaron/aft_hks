/**
 * Hook for interacting with individual Sidebet market contracts
 */

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import {
  MarketInfo,
  MarketStatus,
  Proposal,
  Participant,
  Outcome,
  UserStakeInfo,
} from "~~/types/sidebet";

// Minimal ABI for Sidebet contract (based on ISidebet interface)
const SIDEBET_ABI = [
  {
    inputs: [],
    name: "getMarketInfo",
    outputs: [
      {
        components: [
          { internalType: "string", name: "topic", type: "string" },
          { internalType: "uint256", name: "thresholdPercent", type: "uint256" },
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "totalParticipants", type: "uint256" },
          { internalType: "uint256", name: "totalStaked", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "proposedAt", type: "uint256" },
          { internalType: "uint256", name: "resolvedAt", type: "uint256" },
        ],
        internalType: "struct ISidebet.MarketInfo",
        name: "info",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStatus",
    outputs: [{ internalType: "enum ISidebet.Status", name: "status", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getProposal",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "outcome", type: "uint256" },
          { internalType: "address", name: "proposer", type: "address" },
          { internalType: "uint256", name: "attestationCount", type: "uint256" },
          { internalType: "uint256", name: "disputeUntil", type: "uint256" },
          { internalType: "string", name: "ipfsHash", type: "string" },
        ],
        internalType: "struct ISidebet.Proposal",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getParticipants",
    outputs: [
      {
        components: [
          { internalType: "address", name: "wallet", type: "address" },
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "outcome", type: "uint256" },
          { internalType: "bool", name: "hasAttested", type: "bool" },
        ],
        internalType: "struct ISidebet.Participant[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getProgress",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isThresholdMet",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "getParticipant",
    outputs: [
      {
        components: [
          { internalType: "address", name: "wallet", type: "address" },
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "outcome", type: "uint256" },
          { internalType: "bool", name: "hasAttested", type: "bool" },
        ],
        internalType: "struct ISidebet.Participant",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "outcome", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "outcome", type: "uint256" },
      { internalType: "string", name: "ipfsHash", type: "string" },
    ],
    name: "proposeResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes[]", name: "signatures", type: "bytes[]" },
      { internalType: "uint256", name: "outcome", type: "uint256" },
    ],
    name: "finalizeWithConsensus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "reason", type: "string" }],
    name: "dispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function useSidebet(marketAddress: string) {
  const { address } = useAccount();

  // Read market info
  const { data: marketInfo, isLoading: marketInfoLoading } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getMarketInfo",
  });

  // Read market status
  const { data: status, isLoading: statusLoading } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getStatus",
  });

  // Read proposal
  const { data: proposal, isLoading: proposalLoading } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getProposal",
  });

  // Read participants
  const { data: participants, isLoading: participantsLoading } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getParticipants",
  });

  // Read progress
  const { data: progress } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getProgress",
  });

  // Read threshold check
  const { data: isThresholdMet } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "isThresholdMet",
  });

  // Read user stake info
  const { data: userStake } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getParticipant",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Write contracts
  const { writeContract: stake, isPending: isStaking } = useWriteContract();
  const { writeContract: proposeResult, isPending: isProposing } = useWriteContract();
  const { writeContract: finalize, isPending: isFinalizing } = useWriteContract();
  const { writeContract: dispute, isPending: isDisputing } = useWriteContract();
  const { writeContract: cancel, isPending: isCancelling } = useWriteContract();

  const handleStake = async (amount: string, outcome: Outcome) => {
    if (!stake) throw new Error("Stake not available");

    return stake({
      address: marketAddress as `0x${string}`,
      abi: SIDEBET_ABI,
      functionName: "stake",
      args: [parseUnits(amount, 18), BigInt(outcome)],
    });
  };

  const handlePropose = async (outcome: Outcome, ipfsHash: string) => {
    if (!proposeResult) throw new Error("Propose not available");

    return proposeResult({
      address: marketAddress as `0x${string}`,
      abi: SIDEBET_ABI,
      functionName: "proposeResult",
      args: [BigInt(outcome), ipfsHash],
    });
  };

  const handleFinalize = async (signatures: `0x${string}`[], outcome: Outcome) => {
    if (!finalize) throw new Error("Finalize not available");

    return finalize({
      address: marketAddress as `0x${string}`,
      abi: SIDEBET_ABI,
      functionName: "finalizeWithConsensus",
      args: [signatures, BigInt(outcome)],
    });
  };

  const handleDispute = async (reason: string) => {
    if (!dispute) throw new Error("Dispute not available");

    return dispute({
      address: marketAddress as `0x${string}`,
      abi: SIDEBET_ABI,
      functionName: "dispute",
      args: [reason],
    });
  };

  const handleCancel = async () => {
    if (!cancel) throw new Error("Cancel not available");

    return cancel({
      address: marketAddress as `0x${string}`,
      abi: SIDEBET_ABI,
      functionName: "cancel",
    });
  };

  return {
    // Data
    marketInfo: marketInfo as MarketInfo | undefined,
    status: status as MarketStatus | undefined,
    proposal: proposal as Proposal | undefined,
    participants: (participants as Participant[]) || [],
    progress: progress ? Number(progress) / 100 : 0,
    isThresholdMet: isThresholdMet || false,
    userStake: userStake
      ? {
          hasStaked: (userStake as Participant).stake > 0n,
          stake: (userStake as Participant).stake,
          outcome: (userStake as Participant).outcome,
          hasAttested: (userStake as Participant).hasAttested,
        }
      : {
          hasStaked: false,
          stake: 0n,
          outcome: 0n,
          hasAttested: false,
        },

    // Loading states
    isLoading:
      marketInfoLoading ||
      statusLoading ||
      proposalLoading ||
      participantsLoading,

    // Refetch
    refetch: () => {
      // Refetch is handled by the hook automatically
    },

    // Actions
    stake: handleStake,
    isStaking,
    propose: handlePropose,
    isProposing,
    finalize: handleFinalize,
    isFinalizing,
    dispute: handleDispute,
    isDisputing,
    cancel: handleCancel,
    isCancelling,
  };
}
