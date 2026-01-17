"use client";

/**
 * Telegram Mini App - Create Market Page
 * Create a new prediction market
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSidebetFactory } from "~~/hooks/useSidebetFactory";
import { usePrivyAuth } from "~~/hooks/usePrivy";
import type { TelegramWebApp } from "~~/types/telegram";

export default function CreateMarketPage() {
  const router = useRouter();
  const { authenticated, login } = usePrivyAuth();
  const { createMarket } = useSidebetFactory();

  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [topic, setTopic] = useState("");
  const [threshold, setThreshold] = useState("51");
  const [minStake, setMinStake] = useState("10");
  const [tokenAddress, setTokenAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp as unknown as TelegramWebApp;
      setTg(webApp);
      webApp.ready();
      webApp.expand();

      // Setup back button
      webApp.BackButton.show();
      const handleBack = () => {
        router.back();
      };
      webApp.BackButton.onClick(handleBack);

      return () => {
        webApp.BackButton.offClick?.(handleBack);
        webApp.BackButton.hide();
      };
    }
  }, [router]);

  // Update main button
  useEffect(() => {
    if (!tg) return;

    if (!authenticated) {
      tg.MainButton.text = "Connect Wallet";
      tg.MainButton.enable();
      tg.MainButton.show();
      tg.MainButton.onClick(handleConnect);
    } else if (
      topic.trim() &&
      threshold &&
      minStake &&
      tokenAddress.trim()
    ) {
      tg.MainButton.text = "Create Market";
      tg.MainButton.enable();
      tg.MainButton.show();
      tg.MainButton.onClick(handleCreate);
    } else {
      tg.MainButton.disable();
      tg.MainButton.show();
      tg.MainButton.text = "Fill All Fields";
    }

    return () => {
      tg.MainButton.offClick?.(handleConnect);
      tg.MainButton.offClick?.(handleCreate);
    };
  }, [tg, authenticated, topic, threshold, minStake, tokenAddress]);

  const handleConnect = () => {
    if (tg) {
      tg.HapticFeedback.impactOccurred("medium");
    }
    login();
  };

  const handleCreate = async () => {
    if (!topic.trim() || !threshold || !minStake || !tokenAddress.trim()) {
      if (tg) {
        tg.HapticFeedback.notificationOccurred("error");
      }
      return;
    }

    try {
      setIsCreating(true);
      if (tg) {
        tg.HapticFeedback.impactOccurred("heavy");
        tg.MainButton.text = "Creating...";
        tg.MainButton.disable();
      }

      // Create market
      const result = await createMarket(
        topic.trim(),
        parseInt(threshold),
        tokenAddress.trim(),
        (parseFloat(minStake) * 1e6).toString()
      );

      if (tg) {
        tg.HapticFeedback.notificationOccurred("success");

        // Show success popup
        if (tg.popup) {
          await tg.popup({
            title: "Market Created!",
            message: `Your market "${topic}" has been created successfully.\nTransaction: ${result}`,
            buttons: [{ type: "ok", text: "OK" }],
          });
        }
      }

      // Navigate to home
      router.push("/tg");
    } catch (error) {
      console.error("Error creating market:", error);
      if (tg) {
        tg.HapticFeedback.notificationOccurred("error");
        tg.MainButton.text = "Create Market";
        tg.MainButton.enable();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUseTestToken = () => {
    if (tg) {
      tg.HapticFeedback.impactOccurred("light");
    }
    // MockToken address on monad testnet (update with actual)
    setTokenAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  };

  return (
    <div className="telegram-container">
      <div className="create-market-form">
        <div className="detail-section">
          <h2>Create Prediction Market</h2>
          <p style={{ color: "var(--tg-hint-color)", marginBottom: "16px" }}>
            Create a new market for people to bet on. Once created, the market
            address will be predictable and can be shared.
          </p>
        </div>

        {/* Topic Input */}
        <div className="detail-section">
          <label className="form-label">Market Question</label>
          <textarea
            className="textarea-field"
            placeholder="e.g., Will Bitcoin reach $100k by end of 2025?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            maxLength={200}
          />
          <div style={{ textAlign: "right", fontSize: "12px", color: "var(--tg-hint-color)", marginTop: "4px" }}>
            {topic.length}/200
          </div>
        </div>

        {/* Threshold Input */}
        <div className="detail-section">
          <label className="form-label">Consensus Threshold (%)</label>
          <input
            type="number"
            className="input-field"
            placeholder="51"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            min="1"
            max="100"
          />
          <p style={{ fontSize: "12px", color: "var(--tg-hint-color)", marginTop: "8px" }}>
            Percentage of participants needed to reach consensus
          </p>
        </div>

        {/* Minimum Stake Input */}
        <div className="detail-section">
          <label className="form-label">Minimum Stake</label>
          <input
            type="number"
            className="input-field"
            placeholder="10"
            value={minStake}
            onChange={(e) => setMinStake(e.target.value)}
            min="1"
            step="0.01"
          />
          <p style={{ fontSize: "12px", color: "var(--tg-hint-color)", marginTop: "8px" }}>
            Minimum amount required to participate
          </p>
        </div>

        {/* Token Address Input */}
        <div className="detail-section">
          <label className="form-label">Token Address</label>
          <input
            type="text"
            className="input-field"
            placeholder="0x..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={handleUseTestToken}
            style={{ marginTop: "8px", width: "100%" }}
          >
            Use MockToken (Testnet)
          </button>
        </div>

        {/* Info Section */}
        <div className="detail-section">
          <h3>How it works</h3>
          <ul style={{ paddingLeft: "20px", color: "var(--tg-hint-color)", fontSize: "14px" }}>
            <li>Users stake tokens on YES or NO outcomes</li>
            <li>Anyone can propose a result with evidence</li>
            <li>Participants attest to the correct outcome</li>
            <li>Once threshold is reached, market finalizes</li>
            <li>Winners receive their share of the pool</li>
          </ul>
        </div>

        {/* Auth Warning */}
        {!authenticated && (
          <div className="detail-section">
            <div
              style={{
                background: "rgba(255, 193, 7, 0.2)",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #f59e0b",
              }}
            >
              <p style={{ margin: 0, color: "#f59e0b", fontSize: "14px" }}>
                ⚠️ Connect your wallet to create a market
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isCreating && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div style={{ textAlign: "center", color: "white" }}>
              <div className="spinner"></div>
              <p>Creating market...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
