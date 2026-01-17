/**
 * Sidebets Telegram Bot
 * Main entry point for the Telegram bot
 */

// Load environment variables FIRST, before any other imports
import 'dotenv/config';

import { Bot, hydrateFiles } from 'grammy';
// import { autoRetry } from 'grammy-auto-retry'; // Disabled - package not found
import { config } from './config';
import { logger } from './utils/logger';
import { BotContext, userMiddleware, commandTracking, errorLogging } from './middleware';
import { registerCommands } from './handlers/commands';
import { registerCallbackHandlers } from './handlers/callbacks';
import { MarketBrowser } from './handlers/marketBrowser';
import { NotificationService } from './services/notifications';

// Create bot instance
const bot = new Bot<BotContext>(config.BOT_TOKEN);

// Setup auto-retry for rate limits
// bot.api.config.use(autoRetry()); // Disabled - package not found

// Setup file handling (for future features like images)
bot.api.config.use(hydrateFiles(bot.token));

// Register middleware
bot.use(errorLogging);
bot.use(userMiddleware);
bot.use(commandTracking);

// Register command handlers
registerCommands(bot);

// Register callback query handlers
registerCallbackHandlers(bot);

// Initialize conversation handlers
const marketBrowser = new MarketBrowser(bot);
marketBrowser.register();

// Initialize notification service (for background polling)
const notificationService = new NotificationService(bot);
notificationService.start();

// Handle unknown commands
bot.on('msg:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) {
    await ctx.reply('Unknown command. Use /help to see available commands.');
  }
});

// Error handler
bot.catch((err) => {
  logger.error('Bot error', {
    error: err.message,
    context: err.ctx,
  });
});

// Start the bot
async function start() {
  logger.info('Starting Sidebets Telegram Bot...', {
    environment: config.NODE_ENV,
    relayerUrl: config.RELAYER_API_URL,
  });

  await bot.api.setMyCommands([
    { command: 'start', description: 'Start using the bot' },
    { command: 'markets', description: 'Browse all markets' },
    { command: 'subscriptions', description: 'Manage your subscriptions' },
    { command: 'settings', description: 'Configure your settings' },
    { command: 'help', description: 'Get help and information' },
    { command: 'about', description: 'About Sidebets' },
  ]);

  logger.info('Bot commands registered');

  // Start polling
  await bot.start();

  logger.info('Bot started successfully!');
  logger.info('=================================');
}

// Handle graceful shutdown
async function shutdown() {
  logger.info('Shutting down bot...');

  // Stop notification service
  await notificationService.stop();

  // Stop bot
  bot.stop();

  logger.info('Bot shut down complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
start().catch((err) => {
  logger.error('Failed to start bot', { error: err });
  process.exit(1);
});

export { bot };
