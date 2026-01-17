"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { MarketStatus, Outcome, Participant, MarketInfo } from "~~/types/sidebet";
import { ProgressBar, StakeModal, ProposeModal, AttestationModal, AttestationList } from "~~/components/sidebet";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Minimal ABI for Sidebet contract
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
    name: "nonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
] as const;

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const marketAddress = params.address as string;

  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [attestModalOpen, setAttestModalOpen] = useState(false);
  const [showAttestationList, setShowAttestationList] = useState(false);

  // Read market data using raw wagmi hooks
  const { data: marketInfo } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getMarketInfo",
  });

  const { data: status } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getStatus",
  });

  const { data: participants } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getParticipants",
  });

  const { data: proposal } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getProposal",
  });

  const { data: progress } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getProgress",
  });

  const { data: nonce } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "nonce",
  });

  // Write contracts
  const { writeContract: stake, isPending: isStaking } = useWriteContract();
  const { writeContract: propose, isPending: isProposing } = useWriteContract();

  const { data: userStake } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: SIDEBET_ABI,
    functionName: "getParticipant",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: tokenBalance } = useScaffoldReadContract({
    contractName: "MockToken",
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  } as any);

  const handleStake = async (amount: string, outcome: Outcome) => {
    if (!stake) throw new Error("Stake not available");
    try {
      await stake({
        address: marketAddress as `0x${string}`,
        abi: SIDEBET_ABI,
        functionName: "stake",
        args: [BigInt(Math.floor(parseFloat(amount) * 1e18)), BigInt(outcome)],
      });
      notification.success("Stake placed successfully!");
    } catch (error: any) {
      notification.error(error.message || "Failed to place stake");
      throw error;
    }
  };

  const handlePropose = async (outcome: Outcome, ipfsHash: string) => {
    if (!propose) throw new Error("Propose not available");
    try {
      await propose({
        address: marketAddress as `0x${string}`,
        abi: SIDEBET_ABI,
        functionName: "proposeResult",
        args: [BigInt(outcome), ipfsHash],
      });
      notification.success("Proposal submitted successfully!");
    } catch (error: any) {
      notification.error(error.message || "Failed to submit proposal");
      throw error;
    }
  };

  const handleAttested = (signature: string) => {
    // Refresh data after attestation
    notification.success("Thank you for your attestation!");
  };

  const formatAmount = (amount: bigint) => (Number(amount) / 1e18).toFixed(4);
  const info = marketInfo as MarketInfo | undefined;
  const threshold = info ? Number(info.thresholdPercent) / 100 : 60;
  const progressPercent = progress ? Number(progress) / 100 : 0;
  const currentNonce = nonce ? Number(nonce) : 0;
  const proposalData = proposal as any;

  // Check if user can attest (staked on the proposed outcome)
  const userStakeData = userStake as Participant | undefined;
  const userCanAttest =
    status === MarketStatus.Proposed &&
    userStakeData &&
    userStakeData.stake > 0n &&
    proposalData &&
    userStakeData.outcome === proposalData.outcome &&
    !userStakeData.hasAttested;

  if (!info) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Market not found</h1>
        <button className="btn btn-primary" onClick={() => router.push("/markets")}>Back to Markets</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => router.back()}>← Back to Markets</button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Market Info Card */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <div className="badge badge-primary badge-lg">
                  {status === MarketStatus.Open && "Open for Staking"}
                  {status === MarketStatus.Proposed && "Awaiting Consensus"}
                  {status === MarketStatus.Resolved && "Resolved"}
                  {status === MarketStatus.Disputed && "Disputed"}
                  {status === MarketStatus.Cancelled && "Cancelled"}
                </div>
                <div className="text-sm text-base-content/60">
                  Created: {new Date(Number(info.createdAt) * 1000).toLocaleDateString()}
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-4">{info.topic}</h1>
              <div className="grid grid-cols-3 gap-4">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">Participants</div>
                  <div className="stat-value text-2xl">{info.totalParticipants.toString()}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">Total Staked</div>
                  <div className="stat-value text-2xl">{formatAmount(info.totalStaked)}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">Threshold</div>
                  <div className="stat-value text-2xl">{threshold}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Consensus Progress Section */}
          {status === MarketStatus.Proposed && (
            <>
              <div className="card bg-base-100 border border-primary">
                <div className="card-body">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="card-title text-lg">Consensus Progress</h2>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setShowAttestationList(!showAttestationList)}
                    >
                      {showAttestationList ? "Hide" : "Show"} Attestations
                    </button>
                  </div>
                  <ProgressBar progress={progressPercent} threshold={threshold} showValues={true} size="lg" />
                  {proposalData && (
                    <div className="mt-4 p-4 bg-base-200 rounded-lg">
                      <div className="text-sm">
                        <span className="font-semibold">Proposed Outcome: </span>
                        <span className={proposalData.outcome === BigInt(Outcome.Yes) ? "text-success" : "text-error"}>
                          {proposalData.outcome === BigInt(Outcome.Yes) ? "YES" : "NO"}
                        </span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">Proposed by: </span>
                        <Address address={proposalData.proposer} size="sm" />
                      </div>
                      <div className="text-xs text-base-content/60 mt-1">
                        Dispute ends: {new Date(Number(proposalData.disputeUntil) * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attestation List */}
              {showAttestationList && participants && (
                <AttestationList
                  participants={participants as Participant[]}
                  proposedOutcome={Number(proposalData?.outcome || 0) as Outcome}
                  thresholdPercent={threshold}
                  totalParticipants={Number(info.totalParticipants)}
                />
              )}
            </>
          )}

          {/* Participants Table */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">Participants</h2>
              {participants && (participants as Participant[]).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Outcome</th>
                        <th className="text-right">Stake</th>
                        {status === MarketStatus.Proposed && <th className="text-center">Attested</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(participants as Participant[]).map((p: Participant) => (
                        <tr
                          key={p.wallet}
                          className={p.wallet.toLowerCase() === address?.toLowerCase() ? "bg-primary/10" : ""}
                        >
                          <td><Address address={p.wallet} size="sm" /></td>
                          <td>
                            <span className={`badge ${p.outcome === BigInt(Outcome.Yes) ? "badge-success" : "badge-error"} badge-sm`}>
                              {p.outcome === BigInt(Outcome.Yes) ? "YES" : "NO"}
                            </span>
                          </td>
                          <td className="text-right font-mono">{formatAmount(p.stake)}</td>
                          {status === MarketStatus.Proposed && (
                            <td className="text-center">
                              {p.hasAttested ? (
                                <span className="text-success font-semibold">✓</span>
                              ) : (
                                <span className="text-base-content/30">−</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-base-content/60">No participants yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Position */}
          {userStakeData && userStakeData.stake > 0n && (
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h3 className="card-title text-base">Your Position</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Stake</span>
                    <span className="font-semibold">{formatAmount(userStakeData.stake)} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Outcome</span>
                    <span className={`font-semibold ${userStakeData.outcome === BigInt(Outcome.Yes) ? "text-success" : "text-error"}`}>
                      {userStakeData.outcome === BigInt(Outcome.Yes) ? "YES" : "NO"}
                    </span>
                  </div>
                  {status === MarketStatus.Proposed && (
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Attested</span>
                      <span className={userStakeData.hasAttested ? "text-success" : "text-warning"}>
                        {userStakeData.hasAttested ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions Card */}
          <div className="card bg-base-100 border border-primary">
            <div className="card-body">
              <h3 className="card-title text-base">Actions</h3>

              {status === MarketStatus.Open && (
                <>
                  <button
                    className="btn btn-primary w-full mb-3"
                    onClick={() => setStakeModalOpen(true)}
                    disabled={!address}
                  >
                    {userStakeData && userStakeData.stake > 0n ? "Increase Stake" : "Place Stake"}
                  </button>
                  <button
                    className="btn btn-secondary w-full"
                    onClick={() => setProposeModalOpen(true)}
                    disabled={!address || info.totalParticipants === 0n}
                  >
                    Propose Result
                  </button>
                </>
              )}

              {status === MarketStatus.Proposed && userCanAttest && (
                <button
                  className="btn btn-success w-full mb-3"
                  onClick={() => setAttestModalOpen(true)}
                  disabled={!address}
                >
                  ✍️ Attest Result
                </button>
              )}

              {status === MarketStatus.Proposed && !userCanAttest && userStakeData && userStakeData.stake > 0n && (
                <div className="alert alert-info text-sm py-2">
                  You voted for {userStakeData.outcome === BigInt(Outcome.Yes) ? "YES" : "NO"},
                  but {proposalData?.outcome === BigInt(Outcome.Yes) ? "YES" : "NO"} was proposed.
                </div>
              )}

              {status === MarketStatus.Proposed && (!userStakeData || userStakeData.stake === 0n) && (
                <div className="alert alert-warning text-sm py-2">
                  You must stake to attest on the result.
                </div>
              )}

              <div className="text-xs text-center text-base-content/60 mt-4">
                Token: <Address address={info.token} size="xs" />
              </div>
            </div>
          </div>

          {/* Balance Card */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/60">Your Balance</span>
                <span className="font-semibold">{tokenBalance ? formatAmount(tokenBalance as bigint) : "0.00"} tokens</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StakeModal
        isOpen={stakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onStake={handleStake}
        userBalance={(tokenBalance as bigint | undefined) || 0n}
        isStaking={isStaking}
      />
      <ProposeModal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        onPropose={handlePropose}
        isProposing={isProposing}
      />
      <AttestationModal
        isOpen={attestModalOpen}
        onClose={() => setAttestModalOpen(false)}
        marketAddress={marketAddress}
        marketTopic={info.topic}
        proposedOutcome={Number(proposalData?.outcome || 0) as Outcome}
        nonce={currentNonce}
        onAttested={handleAttested}
      />
    </div>
  );
}
