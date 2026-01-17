"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function CreateMarketPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { data: factoryContract } = useDeployedContractInfo("SidebetFactory");
  const { data: mockToken } = useDeployedContractInfo("MockToken");

  const { writeContractAsync: createMarket, isPending: isCreating } = useScaffoldWriteContract({
    contractName: "SidebetFactory",
  });

  const { data: tokenBalance } = useScaffoldReadContract({
    contractName: "MockToken",
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const [topic, setTopic] = useState("");
  const [threshold, setThreshold] = useState(60);
  const [minStake, setMinStake] = useState("10");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }
    if (!topic.trim()) {
      notification.error("Please enter a topic");
      return;
    }
    if (threshold < 51 || threshold > 99) {
      notification.error("Threshold must be between 51% and 99%");
      return;
    }

    try {
      await createMarket({
        functionName: "createSidebet",
        args: [topic, BigInt(threshold), mockToken?.address || "", BigInt(minStake)],
      });
      notification.success("Market created successfully!");
      router.push("/markets");
    } catch (error: any) {
      notification.error(error.message || "Failed to create market");
    }
  };

  const formatBalance = (balance: bigint) => (Number(balance) / 1e18).toFixed(2);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Market</h1>
        <p className="text-base-content/60">Create a social consensus betting market</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Market Topic / Question</span></label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="e.g., Will Bitcoin reach $100,000 by end of 2025?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
          <label className="label"><span className="label-text-alt">Be specific and clear about the conditions</span></label>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Consensus Threshold</span>
            <span className="label-text-alt">{threshold}%</span>
          </label>
          <input type="range" min="51" max="99" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="range range-primary" />
          <div className="flex justify-between text-xs text-base-content/60 px-1"><span>51%</span><span>75%</span><span>99%</span></div>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Minimum Stake</span></label>
          <div className="join">
            <input type="number" className="input input-bordered join-item flex-1" value={minStake} onChange={(e) => setMinStake(e.target.value)} min="1" step="1" required />
            <span className="btn join-item btn-disabled">Tokens</span>
          </div>
        </div>

        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-bold">Your Balance</h4>
            <p className="text-xs">{tokenBalance ? formatBalance(tokenBalance) : "0.00"} tokens available</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="button" className="btn btn-ghost flex-1" onClick={() => router.back()} disabled={isCreating}>Cancel</button>
          <button type="submit" className="btn btn-primary flex-1" disabled={isCreating || !address}>
            {isCreating ? <><span className="loading loading-spinner loading-sm"></span>Creating...</> : "Create Market"}
          </button>
        </div>
      </form>
    </div>
  );
}
