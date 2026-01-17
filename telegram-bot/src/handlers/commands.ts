/**
 * Command Handlers
 * Bot command handlers (/start, /help, etc.)
 */

import { BotContext } from '../middleware';
import { logger } from '../utils/logger';
import { mainMenuKeyboard, helpKeyboard } from '../keyboards';

/**
 * /start command - Welcome new users
 */
export async function startCommand(ctx: BotContext) {
  const from = ctx.from;
  const username = from?.username || from?.first_name || 'User';

  const welcomeMessage = `
🎲 *Welcome to Sidebets*${username ? `, ${username}` : ''}!

Sidebets is a decentralized social betting protocol on Monad. Create and participate in prediction markets with zero gas fees through EIP-712 signatures.

*Quick Start:*
• Browse active markets
• Subscribe to market updates
• Stake tokens on your predictions
• Vote to finalize outcomes

Use the buttons below to explore or type /help for more info.
`;

  try {
    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(),
    });
    logger.info(`Start command sent to user ${from?.id}`);
  } catch (error) {
    logger.error('Error sending start message', { error });
    await ctx.reply('Welcome to Sidebets! Use /help to see available commands.');
  }
}

/**
 * /help command - Show help information
 */
export async function helpCommand(ctx: BotContext) {
  const helpMessage = `
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

*Market Statuses:*
🟢 Open - Accepting stakes
🟡 Proposed - Result proposed, awaiting attestation
🟢 Resolved - Finalized with consensus
🔴 Disputed - Under dispute review
⚫ Cancelled - Market was cancelled

*Questions?*
Visit our docs or community for more information.
`;

  try {
    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: helpKeyboard(),
    });
  } catch (error) {
    logger.error('Error sending help message', { error });
    await ctx.reply(
      'Commands: /start, /markets, /subscriptions, /settings, /help'
    );
  }
}

/**
 * /markets command - Browse markets
 */
export async function marketsCommand(ctx: BotContext) {
  // This will be handled by the conversation handler
  await ctx.reply('Loading markets...', {
    reply_markup: mainMenuKeyboard(),
  });
}

/**
 * /subscriptions command - Manage subscriptions
 */
export async function subscriptionsCommand(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Please use /start first.');
    return;
  }

  try {
    const subscriptions = await ctx.db?.getSubscriptions(ctx.user.telegramId);

    if (!subscriptions || subscriptions.length === 0) {
      await ctx.reply(
        'You are not subscribed to any markets yet.\n\nBrowse markets and subscribe to get notified about updates!',
        { reply_markup: mainMenuKeyboard() }
      );
      return;
    }

    const message = `
🔔 *Your Subscriptions* (${subscriptions.length})

You'll receive notifications when:
• A result is proposed
• Threshold is reached for finalization
• Market is resolved or disputed
`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error fetching subscriptions', { error });
    await ctx.reply('Could not load your subscriptions. Please try again.');
  }
}

/**
 * /settings command - User settings
 */
export async function settingsCommand(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Please use /start first.');
    return;
  }

  const walletInfo = ctx.user.walletAddress
    ? `Connected: \`${ctx.user.walletAddress.slice(0, 10)}...${ctx.user.walletAddress.slice(-6)}\``
    : 'No wallet connected';

  const message = `
⚙️ *Settings*

${walletInfo}

Connect your wallet to participate in markets through the web app.
`;

  try {
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .text('Open Web App', `${process.env.MINI_APP_URL}`)
      .row()
      .text('Back', 'main_menu');

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error sending settings', { error });
  }
}

/**
 * /about command - About Sidebets
 */
export async function aboutCommand(ctx: BotContext) {
  const aboutMessage = `
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

  try {
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .url('Open App', `${process.env.MINI_APP_URL}`)
      .row()
      .text('Help', 'help')
      .text('Back', 'main_menu');

    await ctx.reply(aboutMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error sending about message', { error });
  }
}

/**
 * Register all commands with the bot
 */
export function registerCommands(bot: any) {
  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('markets', marketsCommand);
  bot.command('subscriptions', subscriptionsCommand);
  bot.command('settings', settingsCommand);
  bot.command('about', aboutCommand);

  logger.info('Commands registered');
}
