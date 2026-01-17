/**
 * Market Browser Conversation Handler
 * Handles interactive market browsing with conversations
 */

import { Bot, session } from 'grammy';
import { BotContext } from '../middleware';
import { logger } from '../utils/logger';
import apiService from '../services/api';
import { formatMarketStatus, formatAddress, formatAmount } from '../keyboards';

/**
 * Market Browser class
 * Handles market browsing through conversations
 */
export class MarketBrowser {
  private bot: Bot<BotContext>;

  constructor(bot: Bot<BotContext>) {
    this.bot = bot;
  }

  /**
   * Register conversation handlers
   */
  register() {
    // Search markets by keyword
    this.bot.callbackQuery('search_markets', this.handleSearchStart.bind(this));
    this.bot.on('msg:text', this.handleSearchInput.bind(this));

    logger.info('Market browser conversations registered');
  }

  /**
   * Handle search start
   */
  private async handleSearchStart(ctx: BotContext) {
    try {
      await ctx.answerCallbackQuery();
      await ctx.reply('🔍 Enter a keyword to search markets:');
    } catch (error) {
      logger.error('Error starting search', { error });
    }
  }

  /**
   * Handle search input
   */
  private async handleSearchInput(ctx: BotContext) {
    const text = ctx.message?.text;
    if (!text) return;

    // Only handle search if user is in search mode
    // This is a simplified implementation
    // In production, use session management

    try {
      await ctx.reply('🔍 Searching...');

      const response = await apiService.getMarkets({ limit: 50, offset: 0 });

      if (!response.success || response.markets.length === 0) {
        await ctx.reply('No markets found.');
        return;
      }

      // Filter markets by keyword
      const keyword = text.toLowerCase();
      const filtered = response.markets.filter(
        (m) =>
          m.topic.toLowerCase().includes(keyword) ||
          m.address.toLowerCase().includes(keyword)
      );

      if (filtered.length === 0) {
        await ctx.reply(`No markets found matching "${text}".`);
        return;
      }

      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard();

      filtered.slice(0, 5).forEach((market) => {
        const status = formatMarketStatus(market.status);
        const topic = market.topic.length > 30
          ? market.topic.slice(0, 30) + '...'
          : market.topic;
        keyboard.text(`${status} ${topic}`, `market_${market.address}`).row();
      });

      keyboard.text('Back', 'main_menu');

      const message = `🔍 *Search Results* (${filtered.length})\n\n_Found for "${text}"_`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      logger.error('Error searching markets', { error });
      await ctx.reply('Error searching markets. Please try again.');
    }
  }

  /**
   * Display market list with pagination
   */
  async displayMarkets(
    ctx: BotContext,
    options: { status?: number; page?: number } = {}
  ): Promise<void> {
    try {
      const { status, page = 0 } = options;
      const offset = page * 10;

      const response = await apiService.getMarkets({
        status,
        limit: 10,
        offset,
      });

      if (!response.success || response.markets.length === 0) {
        await ctx.reply('No markets found.');
        return;
      }

      let message = `📊 *Markets* (Page ${page + 1})\n\n`;

      response.markets.forEach((market, index) => {
        const statusEmoji = formatMarketStatus(market.status);
        const address = formatAddress(market.address);
        const topic = market.topic.length > 40
          ? market.topic.slice(0, 40) + '...'
          : market.topic;

        message += `${index + 1}. ${statusEmoji}\n`;
        message += `   \`${address}\`\n`;
        message += `   ${topic}\n`;
        message += `   Stake: ${formatAmount(market.totalStaked)}\n\n`;
      });

      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard();

      response.markets.forEach((market) => {
        keyboard.text(`${offset + 1}. ${formatAddress(market.address, 4)}`, `market_${market.address}`).row();
      });

      if (page > 0 || response.pagination.total > offset + response.markets.length) {
        if (page > 0) {
          keyboard.text('◀ Prev', `markets_page_${page - 1}`);
        }
        if (response.pagination.total > offset + response.markets.length) {
          keyboard.text('Next ▶', `markets_page_${page + 1}`);
        }
        keyboard.row();
      }

      keyboard.text('Back', 'main_menu');

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      logger.error('Error displaying markets', { error });
      await ctx.reply('Error loading markets. Please try again.');
    }
  }

  /**
   * Display single market detail
   */
  async displayMarketDetail(ctx: BotContext, marketAddress: string): Promise<void> {
    try {
      const response = await apiService.getMarket(marketAddress);

      if (!response.success) {
        await ctx.reply('Error loading market details.');
        return;
      }

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

      if (market.proposal) {
        const proposal = market.proposal;
        const outcome = proposal.outcome === 1 ? 'YES ✅' : 'NO ❌';
        message += `\n📋 *Proposal*\n`;
        message += `*Outcome:* ${outcome}\n`;
        message += `*Proposer:* \`${formatAddress(proposal.proposer)}\`\n`;
        message += `*Attestations:* ${attestations.total} (${attestations.yes} YES, ${attestations.no} NO)\n`;
      }

      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard()
        .url('Open in App', `${process.env.WEBAPP_URL}/market/${marketAddress}`)
        .row()
        .text('Refresh', `refresh_market_${marketAddress}`)
        .text('Back', 'browse_markets');

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: keyboard,
      });
    } catch (error) {
      logger.error('Error displaying market detail', { error });
      await ctx.reply('Error loading market details.');
    }
  }

  /**
   * Display user's subscriptions
   */
  async displaySubscriptions(ctx: BotContext): Promise<void> {
    if (!ctx.user) {
      await ctx.reply('Please use /start first.');
      return;
    }

    try {
      const subscriptions = await ctx.db?.getSubscriptions(ctx.user.telegramId);

      if (!subscriptions || subscriptions.length === 0) {
        await ctx.reply('You are not subscribed to any markets yet.');
        return;
      }

      let message = `🔔 *My Subscriptions* (${subscriptions.length})\n\n`;

      for (const sub of subscriptions) {
        try {
          const response = await apiService.getMarket(sub.marketAddress);
          const market = response.market;

          message += `${formatMarketStatus(market.status)} \`${sub.marketAddress}\`\n`;
          message += `${sub.marketTopic}\n`;
          message += `Participants: ${market.totalParticipants}\n\n`;
        } catch {
          message += `⚪ \`${sub.marketAddress}\`\n`;
          message += `${sub.marketTopic}\n\n`;
        }
      }

      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard().text('Back', 'main_menu');

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: keyboard,
      });
    } catch (error) {
      logger.error('Error displaying subscriptions', { error });
      await ctx.reply('Error loading subscriptions.');
    }
  }
}
