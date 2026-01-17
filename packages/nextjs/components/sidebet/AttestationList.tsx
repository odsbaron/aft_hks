"use client";

import { Participant, Outcome } from "~~/types/sidebet";
import { Address } from "@scaffold-ui/components";
import { useAccount } from "wagmi";

interface AttestationListProps {
  participants: Participant[];
  proposedOutcome: Outcome;
  thresholdPercent: number;
  totalParticipants: number;
}

export function AttestationList({
  participants,
  proposedOutcome,
  thresholdPercent,
  totalParticipants,
}: AttestationListProps) {
  const { address } = useAccount();

  // Filter participants who chose the proposed outcome
  const eligibleParticipants = participants.filter((p) => p.outcome === BigInt(proposedOutcome));

  // Count attestations
  const attestationCount = participants.filter((p) => p.hasAttested).length;

  // Calculate required attestations
  const requiredAttestations = Math.ceil((totalParticipants * thresholdPercent) / 100);

  // Calculate progress percentage
  const progressPercent = Math.min((attestationCount / requiredAttestations) * 100, 100);

  const formatAmount = (amount: bigint) => (Number(amount) / 1e18).toFixed(2);
  const getOutcomeLabel = (outcome: bigint) => (outcome === Outcome.Yes ? "YES" : "NO");
  const getOutcomeClass = (outcome: bigint) =>
    outcome === Outcome.Yes ? "badge-success badge-outline" : "badge-error badge-outline";

  // Sort: attested first, then by stake amount
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.hasAttested && !b.hasAttested) return -1;
    if (!a.hasAttested && b.hasAttested) return 1;
    return Number(b.stake - a.stake);
  });

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Attestation Progress</span>
            <span className="text-sm">
              <span className={`font-bold ${attestationCount >= requiredAttestations ? "text-success" : ""}`}>
                {attestationCount}
              </span>
              <span className="text-base-content/60"> / {requiredAttestations}</span>
            </span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progressPercent}
            max={100}
          ></progress>
          <div className="flex justify-between text-xs text-base-content/60 mt-1">
            <span>{attestationCount} attested</span>
            <span>{thresholdPercent}% required</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Participant List */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra w-full">
              <thead className="bg-base-200">
                <tr>
                  <th className="w-8">#</th>
                  <th>Participant</th>
                  <th>Vote</th>
                  <th className="text-right">Stake</th>
                  <th className="text-center">Attested</th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((participant, index) => (
                  <tr
                    key={participant.wallet}
                    className={
                      participant.wallet.toLowerCase() === address?.toLowerCase()
                        ? "bg-primary/10 font-semibold"
                        : ""
                    }
                  >
                    <td className="text-base-content/50 text-sm">{index + 1}</td>
                    <td>
                      <Address address={participant.wallet} size="sm" />
                    </td>
                    <td>
                      <span className={`badge ${getOutcomeClass(participant.outcome)} badge-sm`}>
                        {getOutcomeLabel(participant.outcome)}
                      </span>
                    </td>
                    <td className="text-right font-mono">{formatAmount(participant.stake)}</td>
                    <td className="text-center">
                      {participant.hasAttested ? (
                        <span className="text-success font-semibold">✓ Signed</span>
                      ) : (
                        <span className="text-base-content/30">Not signed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedParticipants.length === 0 && (
            <div className="text-center py-8 text-base-content/60">No participants yet</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-base-content/60 justify-center">
        <div className="flex items-center gap-1">
          <span className="text-success">✓</span> Signed
        </div>
        <div className="flex items-center gap-1">
          <span className="badge badge-success badge-xs">YES</span> Voted YES
        </div>
        <div className="flex items-center gap-1">
          <span className="badge badge-error badge-xs">NO</span> Voted NO
        </div>
      </div>
    </div>
  );
}
