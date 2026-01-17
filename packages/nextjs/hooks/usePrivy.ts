/**
 * Privy Authentication Hook
 *
 * Wraps Privy's React hooks for easier use throughout the application.
 * Provides login, logout, wallet operations, and signing functions.
 *
 * @see https://docs.privy.io/react/react-hooks
 */

"use client";

import {
  usePrivy,
  useWallets,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useLogout as usePrivyLogout,
  useLogin as usePrivyLogin,
} from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import { Outcome } from "~~/types/sidebet";

// User info from Privy
interface UserInfo {
  email?: string;
  googleAccount?: {
    email: string;
    name: string;
  };
  twitterAccount?: {
    username: string;
    name: string;
  };
  discordAccount?: {
    username: string;
    discriminator: string;
  };
  telegramAccount?: {
    username: string;
  };
  farcasterAccount?: {
    username: string;
    fid: number;
  };
}

// Wallet info
interface WalletInfo {
  address: string;
  walletClientType: "meta_mask" | "privy" | "coinbase_wallet" | "rainbow" | "wallet_connect" | string;
  chainId: string;
}

export function usePrivyAuth() {
  const privy = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { signMessage } = useSignMessage();
  const signTypedDataPrivy = useSignTypedData();
  const { logout: privyLogout } = usePrivyLogout();
  const { login: privyLogin } = usePrivyLogin();

  // Get the main embedded wallet
  const mainWallet: WalletInfo | undefined = useMemo(() => {
    if (!wallets || wallets.length === 0) return undefined;
    return wallets[0] as WalletInfo;
  }, [wallets]);

  // Get user address
  const address = mainWallet?.address;

  // Parse user info
  const userInfo: UserInfo | undefined = useMemo(() => {
    if (!privy.user) return undefined;
    const user = privy.user as any;
    return {
      email: user.email,
      googleAccount: user.google,
      twitterAccount: user.twitter,
      discordAccount: user.discord,
      telegramAccount: user.telegram,
      farcasterAccount: user.farcaster,
    };
  }, [privy.user]);

  // Check if user logged in with a specific provider
  const loginMethod = useMemo(() => {
    if (!privy.user) return undefined;
    const user = privy.user as any;
    if (user.email) return "email";
    if (user.google) return "google";
    if (user.twitter) return "twitter";
    if (user.discord) return "discord";
    if (user.telegram) return "telegram";
    if (user.farcaster) return "farcaster";
    return "wallet";
  }, [privy.user]);

  // Login function
  const login = useCallback(async () => {
    try {
      await privyLogin();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, [privyLogin]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await privyLogout();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }, [privyLogout]);

  // Send transaction
  const handleSendTransaction = useCallback(
    async (transaction: { to: string; data: string; value?: string }) => {
      if (!sendTransaction) throw new Error("Send transaction not available");
      try {
        const result = await sendTransaction(transaction);
        return result;
      } catch (error) {
        console.error("Send transaction failed:", error);
        throw error;
      }
    },
    [sendTransaction]
  );

  // Sign message
  const handleSignMessage = useCallback(
    async (message: string) => {
      if (!signMessage) throw new Error("Sign message not available");
      try {
        const signature = await signMessage({ message });
        return signature;
      } catch (error) {
        console.error("Sign message failed:", error);
        throw error;
      }
    },
    [signMessage]
  );

  // EIP-712 Sign typed data
  const handleSignTypedData = useCallback(
    async (
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: string;
      },
      types: Record<string, Array<{ name: string; type: string }>>,
      message: Record<string, string | bigint>
    ) => {
      if (!signTypedDataPrivy) throw new Error("Sign typed data not available");
      try {
        // Privy's signTypedData is an object with a signTypedData method
        const result = signTypedDataPrivy as any;
        const signature = await result.signTypedData({
          type: "eip712",
          domain,
          types,
          message,
        });
        return signature;
      } catch (error) {
        console.error("Sign typed data failed:", error);
        throw error;
      }
    },
    [signTypedDataPrivy]
  );

  // Get display name for user
  const displayName = useMemo(() => {
    if (!userInfo) return undefined;
    if (userInfo.googleAccount?.name) return userInfo.googleAccount.name;
    if (userInfo.twitterAccount?.name) return userInfo.twitterAccount.name;
    if (userInfo.telegramAccount?.username) return `@${userInfo.telegramAccount.username}`;
    if (userInfo.farcasterAccount?.username) return userInfo.farcasterAccount.username;
    if (userInfo.email) return userInfo.email.split("@")[0];
    return address?.slice(0, 6);
  }, [userInfo, address]);

  // Get avatar URL
  const avatarUrl = useMemo(() => {
    if (!userInfo) return undefined;
    if (userInfo.googleAccount) {
      // Get Google avatar
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.googleAccount.name)}&background=6366f1&color=fff`;
    }
    if (userInfo.twitterAccount) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.twitterAccount.username)}&background=1DA1F2&color=fff`;
    }
    if (userInfo.telegramAccount) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.telegramAccount.username)}&background=0088cc&color=fff`;
    }
    return undefined;
  }, [userInfo]);

  return {
    // Privy instance
    privy,

    // Auth state
    ready: privy.ready,
    authenticated: privy.authenticated,
    user: privy.user,
    userInfo,
    loginMethod,
    displayName,
    avatarUrl,

    // Wallet
    address,
    wallets: wallets as WalletInfo[],
    mainWallet,

    // Operations
    login,
    logout,
    sendTransaction: handleSendTransaction,
    signMessage: handleSignMessage,
    signTypedData: handleSignTypedData,

    // Flags
    isConnected: privy.authenticated && !!address,
    isReady: privy.ready,
  };
}
