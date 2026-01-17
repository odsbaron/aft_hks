"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { MarketStatus, Outcome, Participant, MarketInfo } from "~~/types/sidebet";
import { ProgressBar, StakeModal, ProposeModal, AttestationModal, AttestationList } from "~~/components/sidebet";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const marketAddress = params.address as string;

  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [attestModalOpen, setAttestModalOpen] = useState(false);
  const [showAttestationList, setShowAttestationList] = useState(false);

  const { data: marketInfo } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "getMarketInfo",
    address: marketAddress as `0x${string}`,
  });

  const { data: status } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "getStatus",
    address: marketAddress as `0x${string}`,
  });

  const { data: participants } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "getParticipants",
    address: marketAddress as `0x${string}`,
  });

  const { data: proposal } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "getProposal",
    address: marketAddress as `0x${string}`,
  });

  const { data: progress } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "getProgress",
    address: marketAddress as `0x${string}`,
  });

  const { data: nonce } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "nonce",
    address: marketAddress as `0x${string}`,
  });

  const { data: userStake } = useScaffoldReadContract({
    contractName: "Sidebet",
    functionName: "getParticipant",
    address: marketAddress as `0x${string}`,
    args: address ? [address] : undefined,
  });

  const { data: tokenBalance } = useScaffoldReadContract({
    contractName: "MockToken",
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { writeContractAsync: stake, isPending: isStaking } = useScaffoldWriteContract({
    contractName: "Sidebet",
    address: marketAddress as `0x${string}`,
  });

  const { writeContractAsync: propose, isPending: isProposing } = useScaffoldWriteContract({
    contractName: "Sidebet",
    address: marketAddress as `0x${string}`,
  });

  const handleStake = async (amount: string, outcome: Outcome) => {
    try {
      await stake({
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
    try {
      await propose({
        functionName: "proposeResult",
        args: [BigInt(outcome), ipfsHash as `0x${string}`],
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
  const info = marketInfo as MarketInfo;
  const threshold = info ? Number(info.thresholdPercent) / 100 : 60;
  const progressPercent = progress ? Number(progress) / 100 : 0;
  const currentNonce = nonce ? Number(nonce) : 0;

  // Check if user can attest (staked on the proposed outcome)
  const userCanAttest =
    status === MarketStatus.Proposed &&
    userStake &&
    (userStake as Participant).stake > 0n &&
    proposal &&
    (userStake as Participant).outcome === proposal.outcome &&
    !(userStake as Participant).hasAttested;

  if (!marketInfo) {
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
                  {proposal && (
                    <div className="mt-4 p-4 bg-base-200 rounded-lg">
                      <div className="text-sm">
                        <span className="font-semibold">Proposed Outcome: </span>
                        <span className={proposal.outcome === Outcome.Yes ? "text-success" : "text-error"}>
                          {proposal.outcome === Outcome.Yes ? "YES" : "NO"}
                        </span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">Proposed by: </span>
                        <Address address={proposal.proposer} size="sm" />
                      </div>
                      <div className="text-xs text-base-content/60 mt-1">
                        Dispute ends: {new Date(Number(proposal.disputeUntil) * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attestation List */}
              {showAttestationList && participants && (
                <AttestationList
                  participants={participants as Participant[]}
                  proposedOutcome={proposal.outcome}
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
                            <span className={`badge ${p.outcome === Outcome.Yes ? "badge-success" : "badge-error"} badge-sm`}>
                              {p.outcome === Outcome.Yes ? "YES" : "NO"}
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
          {userStake && (userStake as Participant).stake > 0n && (
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h3 className="card-title text-base">Your Position</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Stake</span>
                    <span className="font-semibold">{formatAmount((userStake as Participant).stake)} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Outcome</span>
                    <span className={`font-semibold ${(userStake as Participant).outcome === Outcome.Yes ? "text-success" : "text-error"}`}>
                      {(userStake as Participant).outcome === Outcome.Yes ? "YES" : "NO"}
                    </span>
                  </div>
                  {status === MarketStatus.Proposed && (
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Attested</span>
                      <span className={(userStake as Participant).hasAttested ? "text-success" : "text-warning"}>
                        {(userStake as Participant).hasAttested ? "✓ Yes" : "✗ No"}
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
                    {(userStake as Participant)?.stake > 0n ? "Increase Stake" : "Place Stake"}
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

              {status === MarketStatus.Proposed && !userCanAttest && userStake && (userStake as Participant).stake > 0n && (
                <div className="alert alert-info text-sm py-2">
                  You voted for {(userStake as Participant).outcome === Outcome.Yes ? "YES" : "NO"},
                  but {proposal?.outcome === Outcome.Yes ? "YES" : "NO"} was proposed.
                </div>
              )}

              {status === MarketStatus.Proposed && (!userStake || (userStake as Participant).stake === 0n) && (
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
                <span className="font-semibold">{tokenBalance ? formatAmount(tokenBalance) : "0.00"} tokens</span>
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
        userBalance={tokenBalance || 0n}
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
        proposedOutcome={proposal?.outcome || Outcome.Yes}
        nonce={currentNonce}
        onAttested={handleAttested}
      />
    </div>
  );
}
