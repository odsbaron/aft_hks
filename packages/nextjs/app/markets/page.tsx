"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MarketStatus, MarketInfo } from "~~/types/sidebet";
import { MarketCard } from "~~/components/sidebet";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

type MarketWithData = {
  address: string;
  info: MarketInfo;
  status: MarketStatus;
  progress: number;
};

export default function MarketsPage() {
  const { address } = useAccount();
  const { data: factoryContract } = useDeployedContractInfo("SidebetFactory");

  const [markets, setMarkets] = useState<MarketWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "proposed" | "resolved">("all");

  const { data: allMarkets } = useScaffoldReadContract({
    contractName: "SidebetFactory",
    functionName: "getAllMarkets",
  });

  useEffect(() => {
    const fetchMarkets = async () => {
      if (!factoryContract || !allMarkets || allMarkets.length === 0) {
        setLoading(false);
        return;
      }

      const marketPromises = (allMarkets as string[]).map(async (addr: string) => {
        try {
          const info = await fetchMarketInfo(addr);
          const status = await fetchMarketStatus(addr);
          return { address: addr, info, status, progress: 0 };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(marketPromises);
      const validMarkets = results.filter((m): m is MarketWithData => m !== null);
      setMarkets(validMarkets.reverse());
      setLoading(false);
    };

    fetchMarkets();
  }, [allMarkets, factoryContract]);

  const fetchMarketInfo = async (addr: string): Promise<MarketInfo> => {
    const response = await fetch(`/api/market/${addr}/info`);
    if (!response.ok) throw new Error("Failed to fetch market info");
    return response.json();
  };

  const fetchMarketStatus = async (addr: string): Promise<MarketStatus> => {
    const response = await fetch(`/api/market/${addr}/status`);
    if (!response.ok) throw new Error("Failed to fetch market status");
    return response.json();
  };

  const filteredMarkets = markets.filter((m) => {
    if (filter === "all") return true;
    if (filter === "open") return m.status === MarketStatus.Open;
    if (filter === "proposed") return m.status === MarketStatus.Proposed;
    if (filter === "resolved") return m.status === MarketStatus.Resolved;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Betting Markets</h1>
          <p className="text-base-content/60">
            {markets.length} {markets.length === 1 ? "market" : "markets"} available
          </p>
        </div>
        <Link href="/create">
          <button className="btn btn-primary gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Market
          </button>
        </Link>
      </div>

      <div className="tabs tabs-boxed mb-6 bg-base-200">
        <button className={`tab ${filter === "all" ? "tab-active" : ""}`} onClick={() => setFilter("all")}>
          All ({markets.length})
        </button>
        <button className={`tab ${filter === "open" ? "tab-active" : ""}`} onClick={() => setFilter("open")}>
          Open ({markets.filter((m) => m.status === MarketStatus.Open).length})
        </button>
        <button className={`tab ${filter === "proposed" ? "tab-active" : ""}`} onClick={() => setFilter("proposed")}>
          Proposed ({markets.filter((m) => m.status === MarketStatus.Proposed).length})
        </button>
        <button className={`tab ${filter === "resolved" ? "tab-active" : ""}`} onClick={() => setFilter("resolved")}>
          Resolved ({markets.filter((m) => m.status === MarketStatus.Resolved).length})
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {!loading && filteredMarkets.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎲</div>
          <h3 className="text-xl font-semibold mb-2">No markets found</h3>
          <p className="text-base-content/60 mb-6">
            {filter === "all" ? "Be the first to create a betting market!" : `No ${filter} markets available.`}
          </p>
          {filter === "all" && (
            <Link href="/create">
              <button className="btn btn-primary">Create Market</button>
            </Link>
          )}
        </div>
      )}

      {!loading && filteredMarkets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.address}
              address={market.address}
              info={market.info}
              status={market.status}
              progress={market.progress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
