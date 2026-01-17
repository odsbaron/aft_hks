"use client";

import { useState, useEffect } from "react";
import { Outcome } from "~~/types/sidebet";
import { useAttestation } from "~~/hooks/useAttestation";
import { notification } from "~~/utils/scaffold-eth";

interface AttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketAddress: string;
  marketTopic: string;
  proposedOutcome: Outcome;
  nonce: number;
  onAttested?: (signature: string) => void;
}

export function AttestationModal({
  isOpen,
  onClose,
  marketAddress,
  marketTopic,
  proposedOutcome,
  nonce,
  onAttested,
}: AttestationModalProps) {
  const { attest, isSigning, getTypedData } = useAttestation();
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setAgreed(false);
    }
  }, [isOpen]);

  const handleAttest = async () => {
    setError("");

    if (!agreed) {
      setError("Please confirm you understand the attestation");
      return;
    }

    try {
      const { signature } = await attest(marketAddress, proposedOutcome, nonce);

      // Submit signature to backend
      await submitSignature(marketAddress, signature, proposedOutcome);

      notification.success("Attestation submitted successfully!");
      onAttested?.(signature);
      onClose();
    } catch (err: any) {
      console.error("Attestation error:", err);
      if (err.message?.includes("User rejected")) {
        setError("You rejected the signature request");
      } else {
        setError(err.message || "Failed to attest");
      }
    }
  };

  const submitSignature = async (market: string, sig: string, outcome: Outcome) => {
    const response = await fetch("/api/attestations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market, signature: sig, outcome }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to submit attestation");
    }

    return response.json();
  };

  const outcomeLabel = proposedOutcome === Outcome.Yes ? "YES" : "NO";
  const outcomeColor = proposedOutcome === Outcome.Yes ? "text-success" : "text-error";
  const outcomeBg = proposedOutcome === Outcome.Yes ? "bg-success" : "bg-error";

  // Shorten address for display
  const shortAddress = `${marketAddress.slice(0, 8)}...${marketAddress.slice(-6)}`;

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span>✍️</span>
            <span>Attest to Result</span>
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Market Info */}
        <div className="bg-base-200 rounded-lg p-4 mb-4">
          <p className="text-xs text-base-content/60 mb-1">Market Topic:</p>
          <p className="font-medium mb-3">{marketTopic}</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-base-content/60">Proposed Outcome:</p>
              <span className={`text-2xl font-bold ${outcomeColor}`}>{outcomeLabel}</span>
            </div>
            <div className={`badge ${outcomeBg} text-white badge-lg`}>
              {outcomeLabel}
            </div>
          </div>
        </div>

        {/* Signature Preview */}
        <div className="bg-base-300 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium mb-2">📜 You are signing:</p>
          <div className="font-mono text-xs bg-base-100 p-3 rounded border border-base-300">
            <div className="grid grid-cols-[80px_1fr] gap-1">
              <span className="text-base-content/60">Domain:</span>
              <span>Sidebet v1</span>

              <span className="text-base-content/60">Market:</span>
              <span className="break-all">{shortAddress}</span>

              <span className="text-base-content/60">Outcome:</span>
              <span className={outcomeColor}>{outcomeLabel} ({proposedOutcome})</span>

              <span className="text-base-content/60">Nonce:</span>
              <span>{nonce}</span>
            </div>
          </div>
          <p className="text-xs text-base-content/60 mt-2">
            ⓘ This signature is free (no gas) and confirms your agreement with the proposed outcome.
          </p>
        </div>

        {/* Warning */}
        <div className="alert alert-warning text-sm mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Your signature helps reach consensus. Only attest if you agree with the outcome.</span>
        </div>

        {/* Confirmation Checkbox */}
        <div className="form-control mb-4">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="label-text">
              I confirm that I agree with the proposed outcome and understand this action is irreversible.
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error text-sm py-2 mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isSigning}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAttest}
            disabled={isSigning || !agreed}
          >
            {isSigning ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Signing...
              </>
            ) : (
              <>
                <span>✍️</span>
                Confirm & Sign
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}
