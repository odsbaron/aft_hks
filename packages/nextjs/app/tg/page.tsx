"use client";

/**
 * Telegram Mini App Home Page
 * Entry point for the Telegram Mini App
 */

import { useEffect, useState } from "react";
import { useSidebetFactory } from "~~/hooks/useSidebetFactory";
import { MarketCard } from "~~/components/sidebet/MarketCard";
import { ProgressBar } from "~~/components/sidebet/ProgressBar";
import type { TelegramWebApp } from "~~/types/telegram";

type MarketStatus = 0 | 1 | 2 | 3 | 4; // Open | Proposed | Resolved | Disputed | Cancelled

interface Market {
  address: string;
  topic: string;
  thresholdPercent: number;
  token: string;
  totalParticipants: number;
  totalStaked: string;
  status: MarketStatus;
  createdAt: string;
  proposal?: {
    outcome: number;
    attestationCount: number;
    disputeUntil: string;
  };
}

export default function TelegramMiniApp() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const { allMarkets } = useSidebetFactory();

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      setTg(webApp);

      // Tell Telegram we're ready
      webApp.ready();
      webApp.expand();

      // Apply theme
      document.body.style.backgroundColor = webApp.themeParams.bg_color || "#ffffff";
      document.body.style.color = webApp.themeParams.text_color || "#000000";
    }
  }, []);

  // Fetch markets
  useEffect(() => {
    loadMarkets();
  }, [allMarkets, statusFilter]);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      // allMarkets is a string[] of addresses, convert to Market objects
      const data = allMarkets.slice(0, 10).map((address: string) => ({
        address,
        topic: `Market ${address.slice(0, 6)}...`,
        thresholdPercent: 60,
        token: "0x0000000000000000000000000000000000000000",
        totalParticipants: 0,
        totalStaked: "0",
        status: 0 as MarketStatus,
        createdAt: new Date().toISOString(),
      }));
      setMarkets(data);
    } catch (error) {
      console.error("Error loading markets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketClick = (marketAddress: string) => {
    if (tg) {
      tg.HapticFeedback.impactOccurred("light");
    }
    // Navigate to market detail
    window.location.href = `/tg/market/${marketAddress}`;
  };

  const handleCreateMarket = () => {
    if (tg) {
      tg.HapticFeedback.impactOccurred("medium");
    }
    window.location.href = "/tg/create";
  };

  const handleRefresh = () => {
    if (tg) {
      tg.HapticFeedback.notificationOccurred("success");
    }
    loadMarkets();
  };

  return (
    <div className="telegram-container">
      {/* Header */}
      <header className="telegram-header">
        <div className="header-logo">
          <span className="logo-icon">🎲</span>
          <h1>Sidebets</h1>
        </div>
        <button
          className="icon-button"
          onClick={handleRefresh}
          aria-label="Refresh"
        >
          🔄
        </button>
      </header>

      {/* Status Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`tab ${statusFilter === null ? "active" : ""}`}
          onClick={() => setStatusFilter(null)}
        >
          All
        </button>
        <button
          className={`tab ${statusFilter === 0 ? "active" : ""}`}
          onClick={() => setStatusFilter(0)}
        >
          🟢 Open
        </button>
        <button
          className={`tab ${statusFilter === 1 ? "active" : ""}`}
          onClick={() => setStatusFilter(1)}
        >
          🟡 Proposed
        </button>
        <button
          className={`tab ${statusFilter === 2 ? "active" : ""}`}
          onClick={() => setStatusFilter(2)}
        >
          ✅ Resolved
        </button>
      </div>

      {/* Markets List */}
      <div className="markets-list">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No Markets Found</h3>
            <p>Be the first to create a prediction market!</p>
            <button className="btn-primary" onClick={handleCreateMarket}>
              Create Market
            </button>
          </div>
        ) : (
          markets.map((market) => (
            <div
              key={market.address}
              className="market-item"
              onClick={() => handleMarketClick(market.address)}
            >
              <div className="market-header">
                <span className="market-status">
                  {getStatusEmoji(market.status)}
                </span>
                <span className="market-participants">
                  👥 {market.totalParticipants}
                </span>
              </div>
              <h3 className="market-topic">{market.topic}</h3>
              <div className="market-stats">
                <div className="stat">
                  <span className="stat-label">Staked</span>
                  <span className="stat-value">
                    {formatAmount(market.totalStaked)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Threshold</span>
                  <span className="stat-value">{market.thresholdPercent}%</span>
                </div>
              </div>
              {market.status === 1 && market.proposal && (
                <div className="proposal-badge">
                  Proposal: {market.proposal.outcome === 1 ? "YES" : "NO"} (
                  {market.proposal.attestationCount} attestations)
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="bottom-bar">
        <button className="btn-create" onClick={handleCreateMarket}>
          <span className="btn-icon">➕</span>
          Create Market
        </button>
      </div>
    </div>
  );
}

// Helper functions
function getStatusEmoji(status: MarketStatus): string {
  switch (status) {
    case 0:
      return "🟢 Open";
    case 1:
      return "🟡 Proposed";
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
