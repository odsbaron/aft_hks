"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { hardhat } from "viem/chains";
import { Address } from "@scaffold-ui/components";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { MarketStatus, MarketInfo } from "~~/types/sidebet";

export default function Home() {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const { data: allMarkets } = useScaffoldReadContract({
    contractName: "SidebetFactory",
    functionName: "getAllMarkets",
  });

  const { data: marketCount } = useScaffoldReadContract({
    contractName: "SidebetFactory",
    functionName: "getTotalMarkets",
  });

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 text-center">
          <h1 className="text-4xl font-bold mb-4">
            <span className="block text-2xl mb-2">Welcome to</span>
            Sidebets
          </h1>
          <p className="text-lg text-base-content/70 mb-8 max-w-2xl mx-auto">
            Social consensus betting on Monad. Create markets, stake tokens, and resolve disputes through community agreement.
          </p>

          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address
              address={connectedAddress}
              chain={targetNetwork}
              blockExplorerAddressLink={
                targetNetwork.id === hardhat.id ? `/blockexplorer/address/${connectedAddress}` : undefined
              }
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4 mb-12">
          <Link href="/markets" className="card bg-base-100 hover:bg-base-200 transition-all cursor-pointer border border-base-300 hover:border-primary">
            <div className="card-body items-center text-center py-8">
              <div className="text-4xl font-bold text-primary mb-2">{marketCount ? marketCount.toString() : "0"}</div>
              <div className="text-base-content/60">Active Markets</div>
            </div>
          </Link>

          <Link href="/create" className="card bg-base-100 hover:bg-base-200 transition-all cursor-pointer border border-base-300 hover:border-success">
            <div className="card-body items-center text-center py-8">
              <div className="text-4xl mb-2">🎲</div>
              <div className="text-base-content/60">Create Market</div>
            </div>
          </Link>

          <Link href="/markets" className="card bg-base-100 hover:bg-base-200 transition-all cursor-pointer border border-base-300 hover:border-info">
            <div className="card-body items-center text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-base-content/60">Browse Markets</div>
            </div>
          </Link>
        </div>

        {/* How it Works */}
        <div className="w-full max-w-4xl px-4 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-base-200">
              <div className="card-body items-center text-center">
                <div className="text-5xl mb-4">1️⃣</div>
                <h3 className="font-bold mb-2">Create a Market</h3>
                <p className="text-sm text-base-content/70">Propose a yes/no question and set a consensus threshold</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body items-center text-center">
                <div className="text-5xl mb-4">2️⃣</div>
                <h3 className="font-bold mb-2">Stake Tokens</h3>
                <p className="text-sm text-base-content/70">Participants stake on YES or NO with their tokens</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body items-center text-center">
                <div className="text-5xl mb-4">3️⃣</div>
                <h3 className="font-bold mb-2">Reach Consensus</h3>
                <p className="text-sm text-base-content/70">When threshold is met, winners split the pot</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Link href="/markets">
            <button className="btn btn-primary btn-lg">Browse Markets</button>
          </Link>
          <Link href="/create">
            <button className="btn btn-outline btn-primary btn-lg">Create Market</button>
          </Link>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <Link href="/debug" className="link">
                Debug Contracts
              </Link>
              <p className="mt-2">Interact with your contracts at low cost</p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <Link href="/blockexplorer" className="link">
                Block Explorer
              </Link>
              <p className="mt-2">Explore your local transactions</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
