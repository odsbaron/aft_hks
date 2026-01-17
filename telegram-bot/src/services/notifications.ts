/**
 * Notification Service
 * Polls for market events and sends notifications to subscribed users
 */

import { Bot } from 'grammy';
import { BotContext } from '../middleware';
import { logger } from '../utils/logger';
import { apiService, Market, MarketDetail, Proposal } from './api';
import db from '../models/database';

// Notification types
export type NotificationType =
  | 'proposal_created'
  | 'threshold_reached'
  | 'disputed'
  | 'resolved'
  | 'cancelled'
  | 'expiry_soon'
  | 'attestation_reminder';

// Market state for tracking changes
interface MarketState {
  status: number;
  proposalOutcome?: number;
  attestationCount?: number;
  isDisputed?: boolean;
  expiresAt?: string;
}

// In-memory state tracking (in production, use Redis)
const marketStates = new Map<string, MarketState>();

// Polling interval (milliseconds)
const POLL_INTERVAL = 60000; // 1 minute
const EXPIRY_CHECK_INTERVAL = 300000; // 5 minutes

/**
 * Notification Service
 * Polls for market changes and sends notifications
 */
export class NotificationService {
  private bot: Bot<BotContext>;
  private pollTimer?: NodeJS.Timeout;
  private expiryTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(bot: Bot<BotContext>) {
    this.bot = bot;
  }

  /**
   * Start the notification service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Notification service already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting notification service...');

    // Initial sync of market states
    this.syncMarketStates().catch((err) => {
      logger.error('Error syncing initial market states', { error: err });
    });

    // Start polling for market changes
    this.pollTimer = setInterval(() => {
      this.pollForChanges().catch((err) => {
        logger.error('Error polling for changes', { error: err });
      });
    }, POLL_INTERVAL);

    // Start polling for expiring markets
    this.expiryTimer = setInterval(() => {
      this.checkExpiringMarkets().catch((err) => {
        logger.error('Error checking expiring markets', { error: err });
      });
    }, EXPIRY_CHECK_INTERVAL);

    logger.info(`Notification service started (polling every ${POLL_INTERVAL / 1000}s)`);
  }

  /**
   * Stop the notification service
   */
  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = undefined;
    }

    logger.info('Notification service stopped');
  }

  /**
   * Sync all market states
   */
  private async syncMarketStates() {
    try {
      const response = await apiService.getMarkets({ limit: 100, offset: 0 });

      if (!response.success) return;

      for (const market of response.markets) {
        const state: MarketState = {
          status: market.status,
        };

        if (market.proposal) {
          state.proposalOutcome = market.proposal.outcome;
          state.attestationCount = market.proposal.attestationCount;
        }

        marketStates.set(market.address.toLowerCase(), state);

        // Also cache in database
        await db.cacheMarket({
          address: market.address,
          topic: market.topic,
          creator: '', // Will be filled on detail fetch
          thresholdPercent: market.thresholdPercent,
          totalParticipants: market.totalParticipants,
          totalStaked: market.totalStaked,
          status: market.status,
        });
      }

      logger.debug(`Synced ${response.markets.length} market states`);
    } catch (error) {
      logger.error('Error syncing market states', { error });
    }
  }

  /**
   * Poll for market changes
   */
  private async pollForChanges() {
    try {
      const response = await apiService.getMarkets({ limit: 100, offset: 0 });

      if (!response.success) return;

      for (const market of response.markets) {
        const address = market.address.toLowerCase();
        const previousState = marketStates.get(address);

        if (!previousState) {
          // New market, add to state
          marketStates.set(address, {
            status: market.status,
            proposalOutcome: market.proposal?.outcome,
          });
          continue;
        }

        // Check for status changes
        if (market.status !== previousState.status) {
          await this.handleStatusChange(market, previousState.status);
        }

        // Check for new proposals
        const hasNewProposal =
          market.proposal && previousState.proposalOutcome === undefined;

        if (hasNewProposal) {
          await this.notifyNewProposal(market);
        }

        // Update state
        const newState: MarketState = {
          status: market.status,
          proposalOutcome: market.proposal?.outcome,
        };
        marketStates.set(address, newState);
      }
    } catch (error) {
      logger.error('Error polling for changes', { error });
    }
  }

  /**
   * Handle market status change
   */
  private async handleStatusChange(market: Market, previousStatus: number) {
    const newStatus = market.status;

    let notificationType: NotificationType;
    let message: string;

    switch (newStatus) {
      case 1: // Proposed
        notificationType = 'proposal_created';
        message = this.createProposalMessage(market);
        break;

      case 2: // Resolved
        notificationType = 'resolved';
        message = this.createResolvedMessage(market);
        break;

      case 3: // Disputed
        notificationType = 'disputed';
        message = this.createDisputedMessage(market);
        break;

      case 4: // Cancelled
        notificationType = 'cancelled';
        message = this.createCancelledMessage(market);
        break;

      default:
        return;
    }

    await this.notifyMarketSubscribers(market, notificationType, message);
  }

  /**
   * Notify about new proposal
   */
  private async notifyNewProposal(market: Market) {
    if (!market.proposal) return;

    const message = this.createProposalMessage(market);
    await this.notifyMarketSubscribers(market, 'proposal_created', message);
  }

  /**
   * Notify market subscribers
   */
  private async notifyMarketSubscribers(
    market: Market,
    type: NotificationType,
    message: string
  ) {
    try {
      const subscribers = await db.getMarketSubscribers(market.address);

      if (subscribers.length === 0) {
        logger.debug(`No subscribers for market ${market.address}`);
        return;
      }

      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard()
        .text('View Market', `market_${market.address}`)
        .row()
        .text('Unsubscribe', `unsubscribe_${market.address}`);

      logger.info(
        `Sending ${type} notification to ${subscribers.length} subscribers`
      );

      for (const sub of subscribers) {
        try {
          await this.bot.api.sendMessage(
            sub.user.telegramId.toString(),
            message,
            {
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
              reply_markup: keyboard,
            }
          );

          // Log successful notification
          await db.logNotification({
            userId: sub.userId,
            telegramId: sub.user.telegramId,
            type,
            marketAddress: market.address,
            message,
            isSuccess: true,
          });
        } catch (error) {
          logger.error(`Error sending notification to ${sub.user.telegramId}`, {
            error,
          });

          // Log failed notification
          await db.logNotification({
            userId: sub.userId,
            telegramId: sub.user.telegramId,
            type,
            marketAddress: market.address,
            message,
            isSuccess: false,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.error('Error notifying subscribers', { error });
    }
  }

  /**
   * Create proposal notification message
   */
  private createProposalMessage(market: Market): string {
    const outcome = market.proposal?.outcome === 1 ? 'YES ✅' : 'NO ❌';

    return `
📋 *Result Proposed!*

Market: ${market.topic}

A result has been proposed:
*Outcome:* ${outcome}

Attest to this outcome if you participated in this market.
`;
  }

  /**
   * Create resolved notification message
   */
  private createResolvedMessage(market: Market): string {
    const outcome = market.proposal?.outcome === 1 ? 'YES ✅' : 'NO ❌';

    return `
✅ *Market Resolved!*

Market: ${market.topic}

*Outcome:* ${outcome}

The market has been finalized with consensus.
`;
  }

  /**
   * Create disputed notification message
   */
  private createDisputedMessage(market: Market): string {
    return `
⚠️ *Market Disputed!*

Market: ${market.topic}

This market has been flagged for dispute review.
`;
  }

  /**
   * Create cancelled notification message
   */
  private createCancelledMessage(market: Market): string {
    return `
❌ *Market Cancelled*

Market: ${market.topic}

This market has been cancelled.
`;
  }

  /**
   * Create expiry warning message
   */
  private createExpiryMessage(market: Market, hoursLeft: number): string {
    return `
⏰ *Expiry Warning!*

Market: ${market.topic}

This proposal expires in ${hoursLeft} hours.
Make sure to attest if you participated!
`;
  }

  /**
   * Check for markets with proposals expiring soon
   */
  private async checkExpiringMarkets() {
    try {
      const response = await apiService.getMarkets({ limit: 100, offset: 0 });

      if (!response.success) return;

      const now = Math.floor(Date.now() / 1000);

      for (const market of response.markets) {
        if (!market.proposal) continue;

        const expiresAt = Math.floor(new Date(market.proposal.disputeUntil).getTime() / 1000);
        const hoursLeft = (expiresAt - now) / 3600;

        // Notify if proposal expires in less than 12 hours
        if (hoursLeft > 0 && hoursLeft < 12) {
          const message = this.createExpiryMessage(market, Math.floor(hoursLeft));
          await this.notifyMarketSubscribers(market, 'expiry_soon', message);
        }
      }
    } catch (error) {
      logger.error('Error checking expiring markets', { error });
    }
  }

  /**
   * Send notification to specific user
   */
  async notifyUser(
    telegramId: bigint,
    type: NotificationType,
    message: string
  ): Promise<boolean> {
    try {
      await this.bot.api.sendMessage(telegramId.toString(), message, {
        parse_mode: 'Markdown',
      });
      return true;
    } catch (error) {
      logger.error(`Error sending notification to ${telegramId}`, { error });
      return false;
    }
  }

  /**
   * Broadcast message to all users
   */
  async broadcast(message: string): Promise<number> {
    try {
      const users = await db.prismaClient.telegramUser.findMany({
        where: { isBlocked: false },
      });

      let sent = 0;

      for (const user of users) {
        try {
          await this.bot.api.sendMessage(user.telegramId.toString(), message, {
            parse_mode: 'Markdown',
          });
          sent++;
        } catch (error) {
          // User might have blocked the bot
          if ((error as any).description?.includes('bot was blocked')) {
            await db.prismaClient.telegramUser.update({
              where: { id: user.id },
              data: { isBlocked: true },
            });
          }
        }
      }

      logger.info(`Broadcast sent to ${sent}/${users.length} users`);
      return sent;
    } catch (error) {
      logger.error('Error broadcasting message', { error });
      return 0;
    }
  }
}
