/**
 * Telegram Bot Keyboards
 * Inline keyboard layouts for bot interactions
 */

import { InlineKeyboard } from 'grammy';

// Status names for display
export const STATUS_NAMES = ['Open', 'Proposed', 'Resolved', 'Disputed', 'Cancelled'] as const;
export const STATUS_EMOJIS = ['', '', '', '', ''] as const;

/**
 * Main menu keyboard
 */
export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('Open Web App', `${process.env.MINI_APP_URL}`)
    .row()
    .text('Browse Markets', 'browse_markets')
    .text('My Subscriptions', 'my_subscriptions')
    .row()
    .text('Help', 'help');
}

/**
 * Markets list keyboard with pagination
 */
export function marketsListKeyboard(
  hasMore: boolean,
  statusFilter?: number
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Status filters
  if (statusFilter === undefined) {
    keyboard
      .text('All', 'filter_status_all')
      .text('Open', 'filter_status_0')
      .text('Proposed', 'filter_status_1')
      .row();
  }

  // Navigation
  keyboard.text('Refresh', 'refresh_markets').row();
  keyboard.text('Back to Menu', 'main_menu');

  return keyboard;
}

/**
 * Market detail keyboard
 */
export function marketDetailKeyboard(
  marketAddress: string,
  status: number,
  canSubscribe: boolean
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Open in Web App
  keyboard.url('Open in App', `${process.env.WEBAPP_URL}/market/${marketAddress}`);

  // Subscribe/Unsubscribe
  if (canSubscribe) {
    keyboard.row().text('Subscribe', `subscribe_${marketAddress}`);
  } else {
    keyboard.row().text('Unsubscribe', `unsubscribe_${marketAddress}`);
  }

  // Refresh
  keyboard.row().text('Refresh', `refresh_market_${marketAddress}`);

  // Back
  keyboard.text('Back to Markets', 'browse_markets');

  return keyboard;
}

/**
 * Subscribe/Unsubscribe confirmation keyboard
 */
export function subscribeKeyboard(marketAddress: string, isSubscribed: boolean): InlineKeyboard {
  const action = isSubscribed ? 'unsubscribe' : 'subscribe';
  const label = isSubscribed ? 'Confirm Unsubscribe' : 'Confirm Subscribe';

  return new InlineKeyboard()
    .text(label, `confirm_${action}_${marketAddress}`)
    .text('Cancel', `market_${marketAddress}`);
}

/**
 * Settings keyboard
 */
export function settingsKeyboard(hasWallet: boolean): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (hasWallet) {
    keyboard.text('Disconnect Wallet', 'disconnect_wallet');
  } else {
    keyboard.text('Connect Wallet', 'connect_wallet');
  }

  keyboard.row();
  keyboard.text('Back', 'main_menu');

  return keyboard;
}

/**
 * Help keyboard
 */
export function helpKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Browse Markets', 'browse_markets')
    .row()
    .text('Main Menu', 'main_menu');
}

/**
 * Market subscription list keyboard
 */
export function subscriptionsKeyboard(subscriptions: Array<{
  marketAddress: string;
  marketTopic: string;
}>): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  subscriptions.forEach((sub, index) => {
    const topic = sub.marketTopic.length > 30
      ? sub.marketTopic.slice(0, 30) + '...'
      : sub.marketTopic;
    keyboard.text(`${index + 1}. ${topic}`, `market_${sub.marketAddress}`).row();
  });

  if (subscriptions.length === 0) {
    keyboard.text('Browse Markets', 'browse_markets').row();
  }

  keyboard.text('Back to Menu', 'main_menu');

  return keyboard;
}

/**
 * Pagination keyboard for markets list
 */
export function paginationKeyboard(
  currentPage: number,
  hasMore: boolean,
  action: string
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (currentPage > 0) {
    keyboard.text('◀ Prev', `${action}_page_${currentPage - 1}`);
  }

  if (hasMore) {
    if (currentPage > 0) {
      keyboard.text('Next ▶', `${action}_page_${currentPage + 1}`);
    } else {
      keyboard.text('Next ▶', `${action}_page_${currentPage + 1}`);
    }
  }

  return keyboard;
}

/**
 * Format market status for display
 */
export function formatMarketStatus(status: number): string {
  const statusConfig = [
    { emoji: '🟢', name: 'Open' },
    { emoji: '🟡', name: 'Proposed' },
    { emoji: '🟢', name: 'Resolved' },
    { emoji: '🔴', name: 'Disputed' },
    { emoji: '⚫', name: 'Cancelled' },
  ];

  const config = statusConfig[status] || { emoji: '⚪', name: 'Unknown' };
  return `${config.emoji} ${config.name}`;
}

/**
 * Format outcome for display
 */
export function formatOutcome(outcome: number): string {
  return outcome === 1 ? 'YES ✅' : 'NO ❌';
}

/**
 * Format address for display (truncate)
 */
export function formatAddress(address: string, length = 6): string {
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: string | number): string {
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : new Date(Number(timestamp) * 1000);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format token amount for display
 */
export function formatAmount(amount: string, decimals = 6): string {
  const value = Number(amount) / Math.pow(10, decimals);
  if (value < 0.01) return `<0.01`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toFixed(2);
}

/**
 * Calculate time remaining
 */
export function timeRemaining(expiryTimestamp: string | number): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = typeof expiryTimestamp === 'string'
    ? Math.floor(new Date(expiryTimestamp).getTime() / 1000)
    : Number(expiryTimestamp);

  const remaining = expiry - now;

  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
