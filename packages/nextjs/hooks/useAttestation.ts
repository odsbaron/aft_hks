/**
 * Hook for EIP-712 Attestation signing
 * Supports both Wagmi and Privy wallets
 */

import { useSignTypedData as useWagmiSignTypedData } from "wagmi";
import { useState, useCallback } from "react";
import { usePrivyAuth } from "./usePrivy";
import { Outcome } from "~~/types/sidebet";

// EIP-712 Domain configuration
const DOMAIN = {
  name: "Sidebet",
  version: "1",
  chainId: 31337, // Default to localhost, will be overridden
} as const;

// EIP-712 Type definitions
const TYPES = {
  Attestation: [
    { name: "market", type: "address" },
    { name: "outcome", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export function useAttestation() {
  const { signTypedData: wagmiSignTypedData } = useWagmiSignTypedData();
  const { signTypedData: privySignTypedData, address: privyAddress, authenticated: privyAuthenticated } = usePrivyAuth();
  const [isSigning, setIsSigning] = useState(false);

  /**
   * Sign an attestation for a market outcome
   * @param marketAddress The market contract address
   * @param outcome The outcome being attested (0 = NO, 1 = YES)
   * @param nonce The current nonce from the contract
   */
  const attest = useCallback(
    async (marketAddress: string, outcome: Outcome, nonce: number) => {
      // Use Privy if authenticated, otherwise use Wagmi
      const usePrivy = privyAuthenticated && !!privyAddress;

      if (!usePrivy && !wagmiSignTypedData) {
        throw new Error("No signing method available. Please connect a wallet.");
      }

      setIsSigning(true);

      try {
        const domain = {
          ...DOMAIN,
          chainId: 31337, // Will use current chain
          verifyingContract: marketAddress,
        };

        const message = {
          market: marketAddress,
          outcome: BigInt(outcome),
          nonce: BigInt(nonce),
        };

        let signature: string;

        if (usePrivy) {
          // Use Privy signing
          signature = await privySignTypedData(domain, TYPES, message);
        } else {
          // Use Wagmi signing
          signature = await wagmiSignTypedData({
            domain,
            types: TYPES,
            primaryType: "Attestation",
            message,
          });
        }

        const signer = usePrivy ? privyAddress : "";

        return { signature, signer: signer || "" };
      } finally {
        setIsSigning(false);
      }
    },
    [privySignTypedData, wagmiSignTypedData, privyAddress, privyAuthenticated]
  );

  /**
   * Get the EIP-712 domain for a specific market
   */
  const getDomain = useCallback(
    (marketAddress: string) => ({
      ...DOMAIN,
      chainId: 31337,
      verifyingContract: marketAddress,
    }),
    []
  );

  /**
   * Get the typed data for signing (for preview)
   */
  const getTypedData = useCallback(
    (marketAddress: string, outcome: Outcome, nonce: number) => ({
      domain: {
        ...DOMAIN,
        chainId: 31337,
        verifyingContract: marketAddress,
      },
      types: TYPES,
      primaryType: "Attestation" as const,
      message: {
        market: marketAddress,
        outcome: BigInt(outcome),
        nonce: BigInt(nonce),
      },
    }),
    []
  );

  return {
    attest,
    isSigning,
    getDomain,
    getTypedData,
    isAuthenticated: privyAuthenticated,
    isConnected: privyAuthenticated || !!wagmiSignTypedData,
  };
}
