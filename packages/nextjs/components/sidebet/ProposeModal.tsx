"use client";

import { useState, useEffect } from "react";
import { Outcome } from "~~/types/sidebet";

interface ProposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropose: (outcome: Outcome, ipfsHash: string) => Promise<void>;
  isProposing?: boolean;
}

export function ProposeModal({ isOpen, onClose, onPropose, isProposing }: ProposeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedOutcome(null);
      setIpfsHash("");
      setError("");
    }
  }, [isOpen]);

  const handlePropose = async () => {
    setError("");
    if (selectedOutcome === null) {
      setError("Please select an outcome");
      return;
    }
    if (!ipfsHash.trim()) {
      setError("Please enter an evidence hash (IPFS)");
      return;
    }
    const hashToUse = ipfsHash.startsWith("0x") ? ipfsHash : `0x${ipfsHash}`;
    try {
      await onPropose(selectedOutcome, hashToUse);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit proposal");
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Propose Result</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="alert alert-warning text-sm mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Submitting a false proposal may result in penalties. Make sure you have evidence.</span>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">What was the outcome?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`btn btn-lg ${selectedOutcome === Outcome.Yes ? "btn-success" : "btn-outline btn-success"}`}
              onClick={() => setSelectedOutcome(Outcome.Yes)}
            >YES</button>
            <button
              className={`btn btn-lg ${selectedOutcome === Outcome.No ? "btn-error" : "btn-outline btn-error"}`}
              onClick={() => setSelectedOutcome(Outcome.No)}
            >NO</button>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Evidence IPFS Hash</label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Qm... or 0x..."
            value={ipfsHash}
            onChange={(e) => setIpfsHash(e.target.value)}
          />
          <div className="text-xs text-base-content/60 mt-1">Upload evidence to IPFS and enter the hash here</div>
        </div>
        {error && <div className="alert alert-error text-sm py-2 mb-4"><span>{error}</span></div>}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isProposing}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePropose} disabled={isProposing || !selectedOutcome}>
            {isProposing ? <><span className="loading loading-spinner loading-sm"></span>Submitting...</> : "Submit Proposal"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}
