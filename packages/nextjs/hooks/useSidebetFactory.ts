/**
 * Hook for interacting with SidebetFactory contract
 */

import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "./scaffold-eth";
import { MarketInfo, MarketStatus } from "~~/types/sidebet";

export function useSidebetFactory() {
  const { data: factoryContract } = useDeployedContractInfo("SidebetFactory");

  // Read total market count
  const { data: marketCount } = useScaffoldReadContract({
    contractName: "SidebetFactory",
    functionName: "getTotalMarkets",
  });

  // Read all markets
  const { data: allMarkets, isLoading: marketsLoading } = useScaffoldReadContract({
    contractName: "SidebetFactory",
    functionName: "getAllMarkets",
  });

  // Get markets by creator
  const useMarketsByCreator = (creator: string) => {
    return useScaffoldReadContract({
      contractName: "SidebetFactory",
      functionName: "getMarketsByCreator",
      args: [creator],
    });
  };

  // Get paginated markets
  const useMarkets = (offset: number, limit: number) => {
    return useScaffoldReadContract({
      contractName: "SidebetFactory",
      functionName: "getMarkets",
      args: [BigInt(offset), BigInt(limit)],
    });
  };

  // Get market info
  const useMarketInfo = (marketAddress: string) => {
    return useScaffoldReadContract({
      contractName: "SidebetFactory",
      functionName: "getMarketInfo",
      args: [marketAddress],
    });
  };

  // Get market status
  const useMarketStatus = (marketAddress: string) => {
    return useScaffoldReadContract({
      contractName: "SidebetFactory",
      functionName: "getMarketStatus",
      args: [marketAddress],
    });
  };

  // Check if valid market
  const useIsValidMarket = (marketAddress: string) => {
    return useScaffoldReadContract({
      contractName: "SidebetFactory",
      functionName: "isValidMarket",
      args: [marketAddress],
    });
  };

  // Predict market address (CREATE2)
  const usePredictAddress = (
    creator: string,
    topic: string,
    thresholdPercent: number,
    tokenAddress: string,
    minStake: string,
    salt: string
  ) => {
    return useScaffoldReadContract({
      contractName: "SidebetFactory",
      functionName: "predictAddress",
      args: [
        creator,
        topic,
        BigInt(thresholdPercent),
        tokenAddress,
        BigInt(minStake),
        salt as `0x${string}`,
      ],
    });
  };

  // Write: Create new sidebet market
  const { writeContractAsync: createSidebet, isPending: isCreating } = useScaffoldWriteContract({
    contractName: "SidebetFactory",
  });

  const handleCreateMarket = async (
    topic: string,
    thresholdPercent: number,
    tokenAddress: string,
    minStake: string,
    salt?: string
  ) => {
    if (!createSidebet) throw new Error("Contract not available");

    return createSidebet({
      functionName: "createSidebet",
      args: [
        topic,
        BigInt(thresholdPercent),
        tokenAddress,
        BigInt(minStake),
      ],
    });
  };

  return {
    factoryContract,
    marketCount: marketCount ? Number(marketCount) : 0,
    allMarkets: (allMarkets as string[]) || [],
    marketsLoading,
    useMarketsByCreator,
    useMarkets,
    useMarketInfo,
    useMarketStatus,
    useIsValidMarket,
    usePredictAddress,
    createMarket: handleCreateMarket,
    isCreating,
  };
}
