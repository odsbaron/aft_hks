/**
 * Bot Middleware
 * User tracking and session management
 */

import { Context, Middleware } from 'grammy';
import db from '../models/database';
import { logger } from '../utils/logger';

// Extend context with user data
export interface BotContext extends Context {
  user?: {
    id: string;
    telegramId: bigint;
    username?: string;
    firstName?: string;
    lastName?: string;
    walletAddress?: string;
    languageCode?: string;
  };
  db?: typeof db;
}

/**
 * User tracking middleware
 * Automatically creates/updates user record on every interaction
 */
export const userMiddleware: Middleware<BotContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) return next();

  try {
    const telegramId = BigInt(from.id);

    // Get or create user
    const user = await db.getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
    });

    // Attach user to context
    ctx.user = {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      walletAddress: user.walletAddress || undefined,
      languageCode: user.languageCode || undefined,
    };

    // Attach db to context
    ctx.db = db;

    logger.debug(`User tracked: ${from.id}`, {
      username: from.username,
      hasWallet: !!user.walletAddress,
    });
  } catch (error) {
    logger.error('Error in user middleware', { error });
  }

  return next();
};

/**
 * Command tracking middleware
 * Updates user's last command
 */
export const commandTracking: Middleware<BotContext> = async (ctx, next) => {
  const result = await next();

  // Track the command if it was a command
  if (ctx.message && 'text' in ctx.message) {
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].slice(1);
      if (ctx.user) {
        try {
          await db.updateLastCommand(ctx.user.telegramId, command);
        } catch (error) {
          logger.error('Error tracking command', { error });
        }
      }
    }
  }

  return result;
};

/**
 * Error logging middleware
 */
export const errorLogging: Middleware<BotContext> = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Bot error', {
      error: error instanceof Error ? error.message : String(error),
      update: ctx.update,
    });

    // Try to send error message to user
    try {
      if (ctx.chat) {
        await ctx.reply(
          'Sorry, something went wrong. Please try again later.'
        );
      }
    } catch (replyError) {
      logger.error('Could not send error message', { error: replyError });
    }
  }
};

/**
 * Session data helper
 */
export class SessionManager {
  /**
   * Set user's current action state
   */
  static async setAction(telegramId: bigint, action: string, data?: string) {
    // This could be extended with a proper session store
    // For now, we use lastCommand to track simple states
    return db.updateLastCommand(telegramId, action + (data ? `:${data}` : ''));
  }

  /**
   * Get user's current action state
   */
  static async getAction(telegramId: bigint): Promise<string | null> {
    const user = await db.getUser(telegramId);
    return user?.lastCommand || null;
  }

  /**
   * Clear user's action state
   */
  static async clearAction(telegramId: bigint) {
    return db.updateLastCommand(telegramId, '');
  }
}
