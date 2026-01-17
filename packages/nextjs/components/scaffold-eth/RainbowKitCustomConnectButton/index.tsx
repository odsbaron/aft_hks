"use client";

// @refresh reset
import { useState } from "react";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { RevealBurnerPKModal } from "./RevealBurnerPKModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Balance } from "@scaffold-ui/components";
import { Address } from "viem";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useAccount } from "wagmi";
import { usePrivyAuth } from "~~/hooks/usePrivy";
import { LoginModal } from "~~/components/sidebet";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 * Enhanced with Privy support for social login
 */
export const RainbowKitCustomConnectButton = () => {
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();
  const { address: wagmiAddress } = useAccount();
  const { ready: privyReady, authenticated: privyAuthenticated, address: privyAddress, loginMethod, displayName, logout } = usePrivyAuth();

  const [showLoginModal, setShowLoginModal] = useState(false);

  // Use Privy address if authenticated, otherwise use Wagmi address
  const address = privyAuthenticated ? privyAddress : wagmiAddress;
  const isPrivyUser = privyAuthenticated && !!privyAddress;

  const handleConnect = () => {
    setShowLoginModal(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, mounted }) => {
          const connected = mounted && address && chain;
          const blockExplorerAddressLink = address
            ? getBlockExplorerAddressLink(targetNetwork, address)
            : undefined;

          return (
            <>
              {(() => {
                if (!connected) {
                  return (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleConnect}
                      type="button"
                      disabled={!privyReady}
                    >
                      {!privyReady && <span className="loading loading-spinner loading-xs"></span>}
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported || chain.id !== targetNetwork.id) {
                  return <WrongNetworkDropdown />;
                }

                return (
                  <>
                    <div className="flex flex-col items-center mr-2">
                      <Balance
                        address={address as Address}
                        style={{
                          minHeight: "0",
                          height: "auto",
                          fontSize: "0.8em",
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: networkColor }}>
                          {chain.name}
                        </span>
                        {isPrivyUser && (
                          <span className="badge badge-primary badge-xs">
                            {loginMethod === "email" && "📧"}
                            {loginMethod === "google" && "🔍"}
                            {loginMethod === "twitter" && "🐦"}
                            {loginMethod === "telegram" && "✈️"}
                            {loginMethod === "farcaster" && "🟣"}
                            {loginMethod === "discord" && "💬"}
                          </span>
                        )}
                      </div>
                    </div>
                    <AddressInfoDropdown
                      address={address as Address}
                      displayName={isPrivyUser ? displayName : account.displayName}
                      ensAvatar={account.ensAvatar}
                      blockExplorerAddressLink={blockExplorerAddressLink}
                      isPrivyUser={isPrivyUser}
                      onLogout={handleLogout}
                    />
                    <AddressQRCodeModal address={address as Address} modalId="qrcode-modal" />
                    <RevealBurnerPKModal />
                  </>
                );
              })()}
            </>
          );
        }}
      </ConnectButton.Custom>

      {/* Privy Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
};
