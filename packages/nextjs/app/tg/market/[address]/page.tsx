"use client";

/**
 * Telegram Mini App - Market Detail Page
 * View and interact with a specific market
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSidebet } from "~~/hooks/useSidebet";
import { usePrivyAuth } from "~~/hooks/usePrivy";
import type { TelegramWebApp } from "~~/types/telegram";

type MarketStatus = 0 | 1 | 2 | 3 | 4; // Open | Proposed | Resolved | Disputed | Cancelled

interface MarketData {
  address: string;
  topic: string;
  thresholdPercent: number;
  token: string;
  totalParticipants: number;
  totalStaked: string;
  status: MarketStatus;
  creator: string;
  createdAt: string;
  proposal?: {
    outcome: number;
    attestationCount: number;
    disputeUntil: string;
    proposer: string;
  };
  attestations?: {
    yes: number;
    no: number;
    total: number;
  };
  userStake?: {
    amount: string;
    outcome: number;
  };
}

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);

  const sidebetHook = useSidebet(address);
  const { authenticated, login } = usePrivyAuth();

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

  // Update main button based on state
  useEffect(() => {
    if (!tg || !market) return;

    if (market.status === 0 && authenticated && selectedOutcome !== null && stakeAmount) {
      tg.MainButton.text = "Stake Tokens";
      tg.MainButton.enable();
      tg.MainButton.show();
      tg.MainButton.onClick(handleStake);
    } else if (market.status === 1 && authenticated) {
      tg.MainButton.text = "Attest Outcome";
      tg.MainButton.enable();
      tg.MainButton.show();
      tg.MainButton.onClick(handleAttest);
    } else if (market.status === 0 && !authenticated) {
      tg.MainButton.text = "Connect Wallet";
      tg.MainButton.enable();
      tg.MainButton.show();
      tg.MainButton.onClick(handleConnect);
    } else {
      tg.MainButton.hide();
    }

    return () => {
      tg.MainButton.offClick?.(handleStake);
      tg.MainButton.offClick?.(handleAttest);
      tg.MainButton.offClick?.(handleConnect);
    };
  }, [tg, market, authenticated, selectedOutcome, stakeAmount]);

  const loadMarket = async () => {
    try {
      setLoading(true);
      // TODO: Fetch market data from relayer API
      // For now, use the hook
      // const data = await getMarket(address);
      // setMarket(data);
    } catch (error) {
      console.error("Error loading market:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadMarket();
    }
  }, [address]);

  const handleConnect = () => {
    if (tg) {
      tg.HapticFeedback.impactOccurred("medium");
    }
    login();
  };

  const handleStake = async () => {
    if (!selectedOutcome || !stakeAmount || !market) return;

    try {
      setIsStaking(true);
      if (tg) {
        tg.HapticFeedback.impactOccurred("heavy");
      }

      // TODO: Implement staking logic
      await sidebetHook.stake(stakeAmount, selectedOutcome as any);

      if (tg) {
        tg.HapticFeedback.notificationOccurred("success");
        tg.MainButton.hide();
      }

      // Reload market data
      await loadMarket();
    } catch (error) {
      console.error("Error staking:", error);
      if (tg) {
        tg.HapticFeedback.notificationOccurred("error");
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleAttest = async () => {
    if (selectedOutcome === null || !market?.proposal) return;

    try {
      setIsStaking(true);
      if (tg) {
        tg.HapticFeedback.impactOccurred("heavy");
      }

      // TODO: Implement attestation logic
      // await sidebetHook.attest(selectedOutcome);

      if (tg) {
        tg.HapticFeedback.notificationOccurred("success");
      }

      // Reload market data
      await loadMarket();
    } catch (error) {
      console.error("Error attesting:", error);
      if (tg) {
        tg.HapticFeedback.notificationOccurred("error");
      }
    } finally {
      setIsStaking(false);
    }
  };

  if (loading) {
    return (
      <div className="telegram-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading market details...</p>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="telegram-container">
        <div className="empty-state">
          <span className="empty-icon">❌</span>
          <h3>Market Not Found</h3>
          <p>The market you're looking for doesn't exist.</p>
          <button
            className="btn-secondary"
            onClick={() => router.push("/tg")}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="telegram-container">
      {/* Market Header */}
      <div className="market-detail-header">
        <div className="status-badge">{getStatusInfo(market.status)}</div>
        <h1>{market.topic}</h1>
        <p className="address">{market.address}</p>
      </div>

      {/* Market Stats */}
      <div className="detail-section">
        <h2>Market Statistics</h2>
        <div className="detail-row">
          <span className="detail-label">Total Staked</span>
          <span className="detail-value">{formatAmount(market.totalStaked)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Participants</span>
          <span className="detail-value">{market.totalParticipants}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Threshold</span>
          <span className="detail-value">{market.thresholdPercent}%</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Creator</span>
          <span className="detail-value">{shortenAddress(market.creator)}</span>
        </div>
      </div>

      {/* Staking Section (only for open markets) */}
      {market.status === 0 && (
        <div className="detail-section">
          <h2>Place Your Bet</h2>
          <div className="stake-options">
            <div
              className={`stake-option ${selectedOutcome === 1 ? "selected" : ""}`}
              onClick={() => {
                setSelectedOutcome(1);
                if (tg) tg.HapticFeedback.impactOccurred("light");
              }}
            >
              <div>
                <div className="stake-option-label">YES ✅</div>
                <div className="stake-option-info">
                  Win if the outcome is true
                </div>
              </div>
              <span className="stake-option-icon">📈</span>
            </div>
            <div
              className={`stake-option ${selectedOutcome === 0 ? "selected" : ""}`}
              onClick={() => {
                setSelectedOutcome(0);
                if (tg) tg.HapticFeedback.impactOccurred("light");
              }}
            >
              <div>
                <div className="stake-option-label">NO ❌</div>
                <div className="stake-option-info">
                  Win if the outcome is false
                </div>
              </div>
              <span className="stake-option-icon">📉</span>
            </div>
          </div>

          {selectedOutcome !== null && (
            <div style={{ marginTop: "16px" }}>
              <input
                type="number"
                className="input-field"
                placeholder="Amount to stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* Attestation Section (only for proposed markets) */}
      {market.status === 1 && market.proposal && (
        <div className="detail-section">
          <h2>Attest to Outcome</h2>
          <p style={{ color: "var(--tg-hint-color)", marginBottom: "16px" }}>
            A result has been proposed. If you participated in this market,
            please attest to the correct outcome.
          </p>

          {market.attestations && (
            <div style={{ marginBottom: "16px" }}>
              <div className="progress-bar">
                <div
                  className="progress-fill yes"
                  style={{
                    width: `${
                      (market.attestations.yes /
                        (market.attestations.total || 1)) *
                      100
                    }%`,
                  }}
                ></div>
                <div
                  className="progress-fill no"
                  style={{
                    width: `${
                      (market.attestations.no /
                        (market.attestations.total || 1)) *
                      100
                    }%`,
                    marginLeft: market.attestations.yes > 0 ? "2px" : "0",
                  }}
                ></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#22c55e" }}>
                  YES: {market.attestations.yes}
                </span>
                <span style={{ color: "#ef4444" }}>
                  NO: {market.attestations.no}
                </span>
              </div>
            </div>
          )}

          <div className="stake-options">
            <div
              className={`attestation-card ${selectedOutcome === 1 ? "selected yes" : ""}`}
              onClick={() => {
                setSelectedOutcome(1);
                if (tg) tg.HapticFeedback.impactOccurred("light");
              }}
            >
              <div className="attestation-header">
                <span className="attestation-outcome">YES ✅</span>
                {market.attestations && (
                  <span className="attestation-count">{market.attestations.yes}</span>
                )}
              </div>
            </div>
            <div
              className={`attestation-card ${selectedOutcome === 0 ? "selected no" : ""}`}
              onClick={() => {
                setSelectedOutcome(0);
                if (tg) tg.HapticFeedback.impactOccurred("light");
              }}
            >
              <div className="attestation-header">
                <span className="attestation-outcome">NO ❌</span>
                {market.attestations && (
                  <span className="attestation-count">{market.attestations.no}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Info */}
      {market.status === 1 && market.proposal && (
        <div className="detail-section">
          <h2>Proposal Details</h2>
          <div className="detail-row">
            <span className="detail-label">Proposed Outcome</span>
            <span className="detail-value">
              {market.proposal.outcome === 1 ? "YES ✅" : "NO ❌"}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Proposer</span>
            <span className="detail-value">{shortenAddress(market.proposal.proposer)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Dispute Period Ends</span>
            <span className="detail-value">
              {new Date(market.proposal.disputeUntil).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Resolved Info */}
      {market.status === 2 && (
        <div className="detail-section">
          <h2>Final Result</h2>
          <div className="detail-row">
            <span className="detail-label">Outcome</span>
            <span className="detail-value">
              {market.proposal?.outcome === 1 ? "YES ✅" : "NO ❌"}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">Finalized ✅</span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isStaking && (
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
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getStatusInfo(status: MarketStatus): string {
  switch (status) {
    case 0:
      return "🟢 Open for Staking";
    case 1:
      return "🟡 Awaiting Attestation";
    case 2:
      return "✅ Resolved";
    case 3:
      return "🔴 Disputed";
    case 4:
      return "⚫ Cancelled";
    default:
      return "⚪ Unknown";
  }
}

function formatAmount(amount: string): string {
  const value = Number(amount) / 1e6;
  if (value < 0.01) return "<0.01";
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toFixed(2);
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
