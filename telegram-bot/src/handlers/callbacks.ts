/**
 * Callback Query Handlers
 * Handle inline button interactions
 */

import { BotContext } from '../middleware';
import { logger } from '../utils/logger';
import apiService from '../services/api';
import {
  formatMarketStatus,
  formatOutcome,
  formatAddress,
  formatAmount,
  formatDate,
  timeRemaining,
  marketsListKeyboard,
  marketDetailKeyboard,
  helpKeyboard,
} from '../keyboards';

// Pagination state (in production, use Redis or similar)
const paginationState = new Map<string, { page: number; filter?: number }>();

/**
 * Register all callback handlers
 */
export function registerCallbackHandlers(bot: any) {
  // Main menu
  bot.callbackQuery('main_menu', mainMenuCallback);

  // Help
  bot.callbackQuery('help', helpCallback);

  // Browse markets
  bot.callbackQuery('browse_markets', browseMarketsCallback);

  // Refresh markets
  bot.callbackQuery('refresh_markets', browseMarketsCallback);

  // Status filters
  bot.callbackQuery(/^filter_status_(\d+|all)$/, filterMarketsCallback);

  // Market detail view
  bot.callbackQuery(/^market_0x[a-fA-F0-9]+$/, marketDetailCallback);

  // Refresh market
  bot.callbackQuery(/^refresh_market_0x[a-fA-F0-9]+$/, refreshMarketCallback);

  // Subscribe/Unsubscribe
  bot.callbackQuery(/^subscribe_0x[a-fA-F0-9]+$/, subscribeCallback);
  bot.callbackQuery(/^unsubscribe_0x[a-fA-F0-9]+$/, unsubscribeCallback);

  // Confirm subscribe/unsubscribe
  bot.callbackQuery(/^confirm_subscribe_0x[a-fA-F0-9]+$/, confirmSubscribeCallback);
  bot.callbackQuery(/^confirm_unsubscribe_0x[a-fA-F0-9]+$/, confirmUnsubscribeCallback);

  // My subscriptions
  bot.callbackQuery('my_subscriptions', mySubscriptionsCallback);

  // Pagination for markets
  bot.callbackQuery(/^markets_page_(\d+)$/, marketsPageCallback);

  // Pagination for subscriptions
  bot.callbackQuery(/^subscriptions_page_(\d+)$/, subscriptionsPageCallback);

  // Settings actions
  bot.callbackQuery('settings', settingsCallback);
  bot.callbackQuery('connect_wallet', connectWalletCallback);
  bot.callbackQuery('disconnect_wallet', disconnectWalletCallback);

  // About
  bot.callbackQuery('about', aboutCallback);

  // Handle all callback queries to answer them
  bot.on('callback_query:data', async (ctx: BotContext) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      // Callback query might have expired
      logger.debug('Could not answer callback query', { error });
    }
  });

  logger.info('Callback handlers registered');
}

/**
 * Main menu callback
 */
async function mainMenuCallback(ctx: BotContext) {
  const { mainMenuKeyboard } = await import('../keyboards');
  await ctx.editMessageText(
    '🎲 *Sidebets Main Menu*\n\nChoose an option below:',
    {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(),
    }
  ).catch(() => {
    // Message might be too old to edit
    return ctx.reply('Welcome back!', { reply_markup: mainMenuKeyboard() });
  });
}

/**
 * Help callback
 */
async function helpCallback(ctx: BotContext) {
  const message = `
📖 *Sidebets Bot Help*

*Commands:*
/start - Start using the bot
/markets - Browse all markets
/subscriptions - Manage your subscriptions
/settings - Configure your settings
/help - Show this help message

*How it works:*
1️⃣ Browse markets and find one you're interested in
2️⃣ Subscribe to receive updates on market events
3️⃣ Open the web app to stake tokens on predictions
4️⃣ When a result is proposed, you'll be notified
5️⃣ Attest to the outcome if you participated
6️⃣ Once consensus is reached, the market is finalized
`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: helpKeyboard(),
  }).catch(() => {
    return ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: helpKeyboard(),
    });
  });
}

/**
 * Browse markets callback
 */
async function browseMarketsCallback(ctx: BotContext) {
  const userId = ctx.from?.id.toString() || 'unknown';

  try {
    await ctx.editMessageText('🔄 Loading markets...').catch(() => {});

    const response = await apiService.getMarkets({ limit: 10, offset: 0 });

    if (!response.success || response.markets.length === 0) {
      await ctx.editMessageText(
        '📭 No markets found.\n\nBe the first to create a market!',
        {
          reply_markup: marketsListKeyboard(false, undefined),
        }
      ).catch(() => {
        return ctx.reply('📭 No markets found.', {
          reply_markup: marketsListKeyboard(false, undefined),
        });
      });
      return;
    }

    // Store pagination state
    paginationState.set(userId, { page: 0 });

    const message = formatMarketsList(response.markets);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: marketsListKeyboard(
        response.pagination.total > response.markets.length,
        undefined
      ),
    }).catch(() => {
      return ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: marketsListKeyboard(
          response.pagination.total > response.markets.length,
          undefined
        ),
      });
    });
  } catch (error) {
    logger.error('Error loading markets', { error });
    await ctx.editMessageText(
      '❌ Error loading markets. Please try again.',
      { reply_markup: marketsListKeyboard(false, undefined) }
    ).catch(() => {
      return ctx.reply('❌ Error loading markets. Please try again.');
    });
  }
}

/**
 * Filter markets by status
 */
async function filterMarketsCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^filter_status_(\d+|all)$/);
  if (!match) return;

  const statusFilter = match[1] === 'all' ? undefined : parseInt(match[1]);
  const userId = ctx.from?.id.toString() || 'unknown';

  try {
    await ctx.answerCallbackQuery('Loading filtered markets...');
    await ctx.editMessageText('🔄 Loading markets...').catch(() => {});

    const response = await apiService.getMarkets({
      status: statusFilter,
      limit: 10,
      offset: 0,
    });

    // Store pagination state
    paginationState.set(userId, { page: 0, filter: statusFilter });

    if (!response.success || response.markets.length === 0) {
      await ctx.editMessageText(
        `📭 No markets found${statusFilter !== undefined ? ` with status ${formatMarketStatus(statusFilter)}` : ''}.\n\nTry a different filter or create a new market!`,
        {
          reply_markup: marketsListKeyboard(false, statusFilter),
        }
      ).catch(() => {});
      return;
    }

    const message = formatMarketsList(response.markets, statusFilter);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: marketsListKeyboard(
        response.pagination.total > response.markets.length,
        statusFilter
      ),
    }).catch(() => {});
  } catch (error) {
    logger.error('Error filtering markets', { error });
    await ctx.answerCallbackQuery('Error loading markets');
  }
}

/**
 * Markets page callback (pagination)
 */
async function marketsPageCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^markets_page_(\d+)$/);
  if (!match) return;

  const page = parseInt(match[1]);
  const userId = ctx.from?.id.toString() || 'unknown';
  const state = paginationState.get(userId) || { page: 0 };
  const offset = page * 10;

  try {
    await ctx.answerCallbackQuery('Loading more markets...');
    await ctx.editMessageText('🔄 Loading markets...').catch(() => {});

    const response = await apiService.getMarkets({
      status: state.filter,
      limit: 10,
      offset,
    });

    // Update pagination state
    paginationState.set(userId, { page, filter: state.filter });

    if (!response.success || response.markets.length === 0) {
      await ctx.editMessageText('📭 No more markets found.', {
        reply_markup: marketsListKeyboard(false, state.filter),
      }).catch(() => {});
      return;
    }

    const message = formatMarketsList(response.markets, state.filter);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: marketsListKeyboard(
        response.pagination.total > offset + response.markets.length,
        state.filter
      ),
    }).catch(() => {});
  } catch (error) {
    logger.error('Error loading markets page', { error });
    await ctx.answerCallbackQuery('Error loading markets');
  }
}

/**
 * Market detail callback
 */
async function marketDetailCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^market_(0x[a-fA-F0-9]+)$/);
  if (!match) return;

  const marketAddress = match[1];

  try {
    await ctx.answerCallbackQuery('Loading market details...');
    await ctx.editMessageText('🔄 Loading market details...').catch(() => {});

    const response = await apiService.getMarket(marketAddress);

    if (!response.success) {
      await ctx.editMessageText(
        '❌ Error loading market details.',
        { reply_markup: marketsListKeyboard(false, undefined) }
      ).catch(() => {});
      return;
    }

    const message = formatMarketDetail(response);
    const isSubscribed = ctx.user
      ? await ctx.db?.isSubscribed(ctx.user.telegramId, marketAddress)
      : false;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: marketDetailKeyboard(
        marketAddress,
        response.market.status,
        !isSubscribed
      ),
    }).catch(() => {
      return ctx.reply(message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: marketDetailKeyboard(
          marketAddress,
          response.market.status,
          !isSubscribed
        ),
      });
    });
  } catch (error) {
    logger.error('Error loading market detail', { error });
    await ctx.answerCallbackQuery('Error loading market details');
  }
}

/**
 * Refresh market callback
 */
async function refreshMarketCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^refresh_market_(0x[a-fA-F0-9]+)$/);
  if (!match) return;

  const marketAddress = match[1];

  try {
    await ctx.answerCallbackQuery('Refreshing market...');

    // Sync market from blockchain
    await apiService.syncMarket(marketAddress);

    // Get updated market data
    const response = await apiService.getMarket(marketAddress);

    if (!response.success) {
      await ctx.answerCallbackQuery('Error refreshing market');
      return;
    }

    const message = formatMarketDetail(response);
    const isSubscribed = ctx.user
      ? await ctx.db?.isSubscribed(ctx.user.telegramId, marketAddress)
      : false;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: marketDetailKeyboard(
        marketAddress,
        response.market.status,
        !isSubscribed
      ),
    }).catch(() => {});

    await ctx.answerCallbackQuery('Market refreshed!');
  } catch (error) {
    logger.error('Error refreshing market', { error });
    await ctx.answerCallbackQuery('Error refreshing market');
  }
}

/**
 * Subscribe callback (show confirmation)
 */
async function subscribeCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^subscribe_(0x[a-fA-F0-9]+)$/);
  if (!match) return;

  const marketAddress = match[1];

  try {
    await ctx.answerCallbackQuery();

    const { subscribeKeyboard } = await import('../keyboards');
    await ctx.editMessageText(
      '🔔 *Subscribe to Market*\n\nYou will receive notifications when:\n• A result is proposed\n• Threshold is reached\n• Market is resolved or disputed',
      {
        parse_mode: 'Markdown',
        reply_markup: subscribeKeyboard(marketAddress, false),
      }
    ).catch(() => {});
  } catch (error) {
    logger.error('Error showing subscribe dialog', { error });
  }
}

/**
 * Unsubscribe callback (show confirmation)
 */
async function unsubscribeCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^unsubscribe_(0x[a-fA-F0-9]+)$/);
  if (!match) return;

  const marketAddress = match[1];

  try {
    await ctx.answerCallbackQuery();

    const { subscribeKeyboard } = await import('../keyboards');
    await ctx.editMessageText(
      '🔕 *Unsubscribe from Market*\n\nYou will no longer receive notifications for this market.',
      {
        parse_mode: 'Markdown',
        reply_markup: subscribeKeyboard(marketAddress, true),
      }
    ).catch(() => {});
  } catch (error) {
    logger.error('Error showing unsubscribe dialog', { error });
  }
}

/**
 * Confirm subscribe callback
 */
async function confirmSubscribeCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^confirm_subscribe_(0x[a-fA-F0-9]+)$/);
  if (!match) return;

  const marketAddress = match[1];

  if (!ctx.user) {
    await ctx.answerCallbackQuery('Please use /start first');
    return;
  }

  try {
    await ctx.answerCallbackQuery('Subscribing...');

    // Get market topic for display
    const market = await apiService.getMarket(marketAddress);

    await ctx.db?.subscribeToMarket(
      ctx.user.telegramId,
      marketAddress,
      market.market.topic
    );

    const message = `✅ *Subscribed!*\n\nYou will now receive notifications for this market.`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: marketDetailKeyboard(
        marketAddress,
        market.market.status,
        false // Can subscribe = false
      ),
    }).catch(() => {});

    await ctx.answerCallbackQuery('Subscribed!');
  } catch (error) {
    logger.error('Error subscribing', { error });
    await ctx.answerCallbackQuery('Error subscribing');
  }
}

/**
 * Confirm unsubscribe callback
 */
async function confirmUnsubscribeCallback(ctx: BotContext) {
  const match = ctx.callbackQuery?.data.match(/^confirm_unsubscribe_(0x[a-fA-F0-9]+)$/);
  if (!match) return;

  const marketAddress = match[1];

  if (!ctx.user) {
    await ctx.answerCallbackQuery('Please use /start first');
    return;
  }

  try {
    await ctx.answerCallbackQuery('Unsubscribing...');

    await ctx.db?.unsubscribeFromMarket(ctx.user.telegramId, marketAddress);

    const market = await apiService.getMarket(marketAddress);
    const message = `✅ *Unsubscribed!*\n\nYou will no longer receive notifications for this market.`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: marketDetailKeyboard(
        marketAddress,
        market.market.status,
        true // Can subscribe = true
      ),
    }).catch(() => {});

    await ctx.answerCallbackQuery('Unsubscribed!');
  } catch (error) {
    logger.error('Error unsubscribing', { error });
    await ctx.answerCallbackQuery('Error unsubscribing');
  }
}

/**
 * My subscriptions callback
 */
async function mySubscriptionsCallback(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCallbackQuery('Please use /start first');
    return;
  }

  try {
    await ctx.answerCallbackQuery('Loading subscriptions...');

    const subscriptions = await ctx.db?.getSubscriptions(ctx.user.telegramId);

    if (!subscriptions || subscriptions.length === 0) {
      await ctx.editMessageText(
        '🔔 *My Subscriptions*\n\nYou are not subscribed to any markets yet.\n\nBrowse markets and subscribe to get notified about updates!',
        {
          parse_mode: 'Markdown',
          reply_markup: marketsListKeyboard(false, undefined),
        }
      ).catch(() => {
        return ctx.reply('You are not subscribed to any markets yet.');
      });
      return;
    }

    // Load market details for each subscription
    const markets = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const response = await apiService.getMarket(sub.marketAddress);
          return {
            address: sub.marketAddress,
            topic: sub.marketTopic,
            status: response.market.status,
          };
        } catch {
          return {
            address: sub.marketAddress,
            topic: sub.marketTopic,
            status: -1,
          };
        }
      })
    );

    const message = `🔔 *My Subscriptions* (${subscriptions.length})\n\n${markets
      .map((m) => {
        const status = m.status >= 0 ? formatMarketStatus(m.status) : '⚪ Unknown';
        return `${status} \`${m.address}\`\n${m.topic}`;
      })
      .join('\n\n')}`;

    const { subscriptionsKeyboard } = await import('../keyboards');
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: subscriptionsKeyboard(subscriptions),
    }).catch(() => {});
  } catch (error) {
    logger.error('Error loading subscriptions', { error });
    await ctx.answerCallbackQuery('Error loading subscriptions');
  }
}

/**
 * Subscriptions page callback (pagination)
 */
async function subscriptionsPageCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery('Pagination not implemented yet');
}

/**
 * Settings callback
 */
async function settingsCallback(ctx: BotContext) {
  const { settingsKeyboard } = await import('../keyboards');
  const hasWallet = !!ctx.user?.walletAddress;

  const message = `⚙️ *Settings*

Wallet: ${hasWallet ? `Connected` : 'Not connected'}

Connect your wallet to participate in markets through the web app.`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: settingsKeyboard(hasWallet),
  }).catch(() => {
    return ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: settingsKeyboard(hasWallet),
    });
  });
}

/**
 * Connect wallet callback (opens web app)
 */
async function connectWalletCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery('Opening web app...');
  // Web app is opened via URL button, this is just a fallback
}

/**
 * Disconnect wallet callback
 */
async function disconnectWalletCallback(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCallbackQuery('Please use /start first');
    return;
  }

  try {
    await ctx.db?.setWallet(ctx.user.telegramId, '');
    await ctx.answerCallbackQuery('Wallet disconnected');

    const { settingsKeyboard } = await import('../keyboards');
    await ctx.editMessageText(
      '⚙️ *Settings*\n\nWallet: Not connected',
      {
        parse_mode: 'Markdown',
        reply_markup: settingsKeyboard(false),
      }
    ).catch(() => {});
  } catch (error) {
    logger.error('Error disconnecting wallet', { error });
    await ctx.answerCallbackQuery('Error disconnecting wallet');
  }
}

/**
 * About callback
 */
async function aboutCallback(ctx: BotContext) {
  const message = `
🎲 *About Sidebets*

Sidebets is a decentralized social betting protocol built on Monad.

*Key Features:*
• Zero-gas transactions via EIP-712 signatures
• Social consensus for outcome determination
• Dispute mechanism for fairness
• CREATE2 for predictable market addresses
• Telegram bot for easy access

*Learn More:*
Website: https://sidebets.xyz
Docs: https://docs.sidebets.xyz
GitHub: https://github.com/sidebets

Built for Monad Hackathon 🚀
`;

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard()
    .url('Open App', `${process.env.MINI_APP_URL}`)
    .row()
    .text('Help', 'help')
    .text('Back', 'main_menu');

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  }).catch(() => {
    return ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });
}

/**
 * Format markets list for display
 */
function formatMarketsList(markets: any[], statusFilter?: number): string {
  let message = `📊 *Markets* (${markets.length})\n\n`;

  if (statusFilter !== undefined) {
    message += `Filter: ${formatMarketStatus(statusFilter)}\n\n`;
  }

  markets.forEach((market, index) => {
    const status = formatMarketStatus(market.status);
    const address = formatAddress(market.address);
    const topic = market.topic.length > 40
      ? market.topic.slice(0, 40) + '...'
      : market.topic;

    message += `${index + 1}. ${status}\n`;
    message += `   \`${address}\`\n`;
    message += `   ${topic}\n`;
    message += `   Stake: ${formatAmount(market.totalStaked)} | `;
    message += `Participants: ${market.totalParticipants}\n\n`;
  });

  message += '\n_Tap a market address to view details_';

  return message;
}

/**
 * Format market detail for display
 */
function formatMarketDetail(response: any): string {
  const market = response.market;
  const attestations = response.attestations;

  let message = `📊 *Market Details*\n\n`;
  message += `*Status:* ${formatMarketStatus(market.status)}\n`;
  message += `*Topic:* ${market.topic}\n`;
  message += `*Address:* \`${market.address}\`\n`;
  message += `*Creator:* \`${formatAddress(market.creator)}\`\n`;
  message += `*Threshold:* ${market.thresholdPercent}%\n`;
  message += `*Participants:* ${market.totalParticipants}\n`;
  message += `*Total Staked:* ${formatAmount(market.totalStaked)}\n`;

  if (market.status === 0 && market.createdAt) {
    message += `*Created:* ${formatDate(market.createdAt)}\n`;
  }

  if (market.proposal) {
    const proposal = market.proposal;
    message += `\n📋 *Proposal*\n`;
    message += `*Outcome:* ${formatOutcome(proposal.outcome)}\n`;
    message += `*Proposer:* \`${formatAddress(proposal.proposer)}\`\n`;
    message += `*Attestations:* ${attestations.total} (${attestations.yes} YES, ${attestations.no} NO)\n`;

    if (proposal.isDisputed) {
      message += `⚠️ *This proposal is disputed*\n`;
    }
  }

  if (market.status === 2 && market.resolvedAt) {
    message += `\n✅ *Resolved:* ${formatOutcome(market.proposal?.outcome || 0)}\n`;
    message += `*At:* ${formatDate(market.resolvedAt)}\n`;
  }

  return message;
}
