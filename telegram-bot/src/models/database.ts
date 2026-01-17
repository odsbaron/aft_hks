/**
 * Database Service
 * Prisma client wrapper with helper methods
 */

import { PrismaClient } from '@prisma/client';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  /**
   * Get or create a Telegram user
   */
  async getOrCreateUser(data: {
    telegramId: bigint;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }) {
    return this.prisma.telegramUser.upsert({
      where: { telegramId: data.telegramId },
      update: {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        languageCode: data.languageCode,
        updatedAt: new Date(),
      },
      create: {
        telegramId: data.telegramId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        languageCode: data.languageCode,
      },
    });
  }

  /**
   * Update user's wallet address
   */
  async setWallet(telegramId: bigint, walletAddress: string) {
    return this.prisma.telegramUser.update({
      where: { telegramId },
      data: { walletAddress },
    });
  }

  /**
   * Update user's last command
   */
  async updateLastCommand(telegramId: bigint, command: string) {
    return this.prisma.telegramUser.update({
      where: { telegramId },
      data: { lastCommand: command },
    });
  }

  /**
   * Update user's last viewed market
   */
  async updateLastMarket(telegramId: bigint, marketAddress: string) {
    return this.prisma.telegramUser.update({
      where: { telegramId },
      data: { lastMarketViewed: marketAddress },
    });
  }

  /**
   * Get user by Telegram ID
   */
  async getUser(telegramId: bigint) {
    return this.prisma.telegramUser.findUnique({
      where: { telegramId },
      include: {
        subscriptions: true,
      },
    });
  }

  /**
   * Subscribe user to a market
   */
  async subscribeToMarket(telegramId: bigint, marketAddress: string, marketTopic: string) {
    const user = await this.getUser(telegramId);
    if (!user) throw new Error('User not found');

    return this.prisma.subscription.upsert({
      where: {
        telegramId_marketAddress: {
          telegramId,
          marketAddress,
        },
      },
      update: {
        isEnabled: true,
        marketTopic,
      },
      create: {
        userId: user.id,
        telegramId,
        marketAddress,
        marketTopic,
      },
    });
  }

  /**
   * Unsubscribe user from a market
   */
  async unsubscribeFromMarket(telegramId: bigint, marketAddress: string) {
    return this.prisma.subscription.deleteMany({
      where: {
        telegramId,
        marketAddress,
      },
    });
  }

  /**
   * Check if user is subscribed to a market
   */
  async isSubscribed(telegramId: bigint, marketAddress: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: {
        telegramId_marketAddress: {
          telegramId,
          marketAddress,
        },
      },
    });
    return subscription?.isEnabled ?? false;
  }

  /**
   * Get all user subscriptions
   */
  async getSubscriptions(telegramId: bigint) {
    return this.prisma.subscription.findMany({
      where: {
        telegramId,
        isEnabled: true,
      },
    });
  }

  /**
   * Cache or update market data
   */
  async cacheMarket(data: {
    address: string;
    topic: string;
    creator: string;
    thresholdPercent: number;
    totalParticipants: number;
    totalStaked: string;
    status: number;
    proposalOutcome?: number;
    proposalExpiresAt?: Date;
    resolvedAt?: Date | null;
  }) {
    return this.prisma.marketCache.upsert({
      where: { address: data.address },
      update: {
        topic: data.topic,
        creator: data.creator,
        thresholdPercent: data.thresholdPercent,
        totalParticipants: data.totalParticipants,
        totalStaked: data.totalStaked,
        status: data.status,
        proposalOutcome: data.proposalOutcome,
        proposalExpiresAt: data.proposalExpiresAt,
        resolvedAt: data.resolvedAt,
        updatedAt: new Date(),
      },
      create: {
        address: data.address,
        topic: data.topic,
        creator: data.creator,
        thresholdPercent: data.thresholdPercent,
        totalParticipants: data.totalParticipants,
        totalStaked: data.totalStaked,
        status: data.status,
        proposalOutcome: data.proposalOutcome,
        proposalExpiresAt: data.proposalExpiresAt,
        resolvedAt: data.resolvedAt,
      },
    });
  }

  /**
   * Get cached market
   */
  async getCachedMarket(address: string) {
    return this.prisma.marketCache.findUnique({
      where: { address },
    });
  }

  /**
   * Get markets by status
   */
  async getCachedMarketsByStatus(status: number) {
    return this.prisma.marketCache.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get all cached markets
   */
  async getAllCachedMarkets() {
    return this.prisma.marketCache.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Log notification
   */
  async logNotification(data: {
    userId: string;
    telegramId: bigint;
    type: string;
    marketAddress: string;
    message: string;
    isSuccess: boolean;
    errorMessage?: string;
  }) {
    return this.prisma.notification.create({
      data,
    });
  }

  /**
   * Get subscribers for a market
   */
  async getMarketSubscribers(marketAddress: string) {
    return this.prisma.subscription.findMany({
      where: {
        marketAddress,
        isEnabled: true,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return this.prisma.notification.deleteMany({
      where: {
        sentAt: {
          lt: cutoffDate,
        },
      },
    });
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }

  /**
   * Get raw Prisma client for advanced queries
   */
  get prismaClient() {
    return this.prisma;
  }
}

// Export singleton instance
export default new DatabaseService();
