"use client";

import { useState, useEffect } from "react";
import { Outcome } from "~~/types/sidebet";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStake: (amount: string, outcome: Outcome) => Promise<void>;
  userBalance: bigint;
  isStaking?: boolean;
  minStake?: bigint;
}

export function StakeModal({ isOpen, onClose, onStake, userBalance, isStaking, minStake = 0n }: StakeModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setSelectedOutcome(null);
      setError("");
    }
  }, [isOpen]);

  const formatBalance = (balance: bigint) => (Number(balance) / 1e18).toFixed(4);

  const handleStake = async () => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (parseFloat(amount) > Number(userBalance) / 1e18) {
      setError("Insufficient balance");
      return;
    }
    if (BigInt(Math.floor(parseFloat(amount) * 1e18)) < minStake) {
      setError(`Minimum stake is ${(Number(minStake) / 1e18).toFixed(2)} tokens`);
      return;
    }
    if (selectedOutcome === null) {
      setError("Please select an outcome");
      return;
    }
    try {
      await onStake(amount, selectedOutcome);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to place stake");
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Place Your Stake</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="bg-base-200 rounded-lg p-3 mb-4">
          <div className="text-sm text-base-content/60">Available Balance</div>
          <div className="text-xl font-bold">{formatBalance(userBalance)} tokens</div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Outcome</label>
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
          <label className="block text-sm font-medium mb-2">Amount</label>
          <div className="join w-full">
            <input
              type="number"
              className="input input-bordered join-item flex-1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minStake > 0n ? (Number(minStake) / 1e18).toString() : "0"}
              step="0.01"
            />
            <button className="btn btn-primary join-item" onClick={() => setAmount(formatBalance(userBalance))}>MAX</button>
          </div>
          {minStake > 0n && <div className="text-xs text-base-content/60 mt-1">Min: {(Number(minStake) / 1e18).toFixed(2)} tokens</div>}
        </div>
        {error && <div className="alert alert-error text-sm py-2 mb-4"><span>{error}</span></div>}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isStaking}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStake} disabled={isStaking || !selectedOutcome}>
            {isStaking ? <><span className="loading loading-spinner loading-sm"></span>Confirming...</> : "Confirm Stake"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}
