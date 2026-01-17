/**
 * Privy Provider Configuration
 *
 * This provider wraps the application with Privy authentication,
 * allowing users to sign in with social accounts (Email, Google, Twitter, Telegram, Farcaster).
 *
 * @see https://docs.privy.io
 */

"use client";

import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";
import { ReactNode } from "react";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

interface PrivyProviderProps {
  children: ReactNode;
}

/**
 * Privy Provider Component
 *
 * Configures Privy authentication with:
 * - Multiple login methods (Email, Google, Twitter, Discord, Telegram, Farcaster)
 * - Custom theme matching Sidebets branding
 * - Embedded wallet creation on login
 */
export function PrivyProvider({ children }: PrivyProviderProps) {
  // If no Privy App ID is provided, render children without Privy (dev mode)
  if (!privyAppId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID not set, Privy features will be disabled");
    return <>{children}</>;
  }

  return (
    <PrivyProviderBase
      appId={privyAppId}
      config={{
        // Available login methods
        loginMethods: ["email", "wallet", "google", "twitter", "discord", "telegram", "farcaster"],

        // Appearance customization
        appearance: {
          theme: "light",
          accentColor: "#6366f1",
          showWalletLogin: true,
          logo: "/logo.png",
        },

        // Embedded wallet configuration
        embeddedWallets: {
          // Create embedded wallet for users without a wallet
          createOnLogin: "users-without-wallets",
          // Require email verification for wallet creation
          requireUserVerification: "email",
        },

        // Additional configuration
        fundingSources: {
          moonpay: { enabled: true },
          coinbase: { enabled: true },
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
