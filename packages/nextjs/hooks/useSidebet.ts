/**
 * Hook for interacting with individual Sidebet market contracts
 */

import { useAccount, useContractRead, useContractWrite } from "@wagmi/core";
import { useDeployedContractInfo } from "./scaffold-eth";
import { parseUnits } from "viem";
import {
  MarketInfo,
  MarketStatus,
  Proposal,
  Participant,
  Outcome,
  UserStakeInfo,
} from "~~/types/sidebet";
import { BigInt } from "bigint";

export function useSidebet(marketAddress: string) {
  const { address } = useAccount();
  const { data: sidebetContract } = useDeployedContractInfo("Sidebet");

  // Read market info
  const marketInfo = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "getMarketInfo",
  }) as { data?: MarketInfo; refetch: () => void };

  // Read market status
  const status = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "getStatus",
  }) as { data?: MarketStatus; refetch: () => void };

  // Read proposal
  const proposal = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "getProposal",
  }) as { data?: Proposal; refetch: () => void };

  // Read participants
  const participants = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "getParticipants",
  }) as { data?: Participant[]; refetch: () => void };

  // Read progress
  const progress = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "getProgress",
  }) as { data?: bigint; refetch: () => void };

  // Read threshold check
  const isThresholdMet = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "isThresholdMet",
  });

  // Read user stake info
  const userStake = useContractRead({
    address: marketetAddress as `0x${string}`,
    abi: sidebetContract?.abi,
    functionName: "getParticipant",
    args: address ? [address] : undefined,
    enabled: !!address,
  }) as { data?: Participant; refetch: () => void };

  // Write: Stake
  const { writeContract: stake, isPending: isStaking } = useContractWrite();

  const handleStake = async (amount: string, outcome: Outcome) => {
    const info = marketInfo.data;
    if (!info) throw new Error("Market info not loaded");

    return stake({
      address: marketetAddress as `0x${string}`,
      abi: sidebetContract?.abi,
      functionName: "stake",
      args: [parseUnits(amount, 18), BigInt(outcome)],
    });
  };

  // Write: Propose result
  const { writeContract: proposeResult, isPending: isProposing } = useContractWrite();

  const handlePropose = async (outcome: Outcome, ipfsHash: string) => {
    return proposeResult({
      address: marketetAddress as `0x${string}`,
      abi: sidebetContract?.abi,
      functionName: "proposeResult",
      args: [BigInt(outcome), ipfsHash as `0x${string}`],
    });
  };

  // Write: Finalize with consensus
  const { writeContract: finalize, isPending: isFinalizing } = useContractWrite();

  const handleFinalize = async (signatures: `0x${string}`[], outcome: Outcome) => {
    return finalize({
      address: marketetAddress as `0x${string}`,
      abi: sidebetContract?.abi,
      functionName: "finalizeWithConsensus",
      args: [signatures, BigInt(outcome)],
    });
  };

  // Write: Dispute
  const { writeContract: dispute, isPending: isDisputing } = useContractWrite();

  const handleDispute = async (reason: string) => {
    return dispute({
      address: marketetAddress as `0x${string}`,
      abi: sidebetContract?.abi,
      functionName: "dispute",
      args: [reason],
    });
  };

  // Write: Cancel market
  const { writeContract: cancel, isPending: isCancelling } = useContractWrite();

  const handleCancel = async () => {
    return cancel({
      address: marketetAddress as `0x${string}`,
      abi: sidebetContract?.abi,
      functionName: "cancel",
    });
  };

  return {
    // Data
    marketInfo: marketInfo.data,
    status: status.data,
    proposal: proposal.data,
    participants: participants.data || [],
    progress: progress.data ? Number(progress.data) / 100 : 0, // Convert basis points to percentage
    isThresholdMet: isThresholdMet.data || false,
    userStake: userStake.data
      ? {
          hasStaked: userStake.data.stake > 0n,
          stake: userStake.data.stake,
          outcome: userStake.data.outcome,
          hasAttested: userStake.data.hasAttested,
        }
      : {
          hasStaked: false,
          stake: 0n,
          outcome: 0n,
          hasAttested: false,
        },

    // Loading states
    isLoading:
      marketInfo.isLoading ||
      status.isLoading ||
      proposal.isLoading ||
      participants.isLoading,

    // Refetch
    refetch: () => {
      marketInfo.refetch();
      status.refetch();
      proposal.refetch();
      participants.refetch();
      userStake.refetch();
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
