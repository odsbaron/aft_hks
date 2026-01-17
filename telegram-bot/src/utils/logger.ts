/**
 * Logger Utility
 * Simple colored logging for development
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private timestamp(): string {
    return new Date().toISOString().split('T')[1].slice(0, -1);
  }

  private colorize(text: string, color: keyof typeof COLORS): string {
    if (this.isDev) {
      return `${COLORS[color]}${text}${COLORS.reset}`;
    }
    return text;
  }

  info(message: string, data?: unknown): void {
    const msg = `${this.colorize('[INFO]', 'cyan')} ${this.timestamp()} ${message}`;
    console.log(msg);
    if (data) console.log(this.colorize(JSON.stringify(data, null, 2), 'dim'));
  }

  warn(message: string, data?: unknown): void {
    const msg = `${this.colorize('[WARN]', 'yellow')} ${this.timestamp()} ${message}`;
    console.warn(msg);
    if (data) console.warn(this.colorize(JSON.stringify(data, null, 2), 'dim'));
  }

  error(message: string, error?: unknown): void {
    const msg = `${this.colorize('[ERROR]', 'red')} ${this.timestamp()} ${message}`;
    console.error(msg);
    if (error instanceof Error) {
      console.error(this.colorize(error.message, 'red'));
      if (error.stack) console.error(this.colorize(error.stack, 'dim'));
    } else if (error) {
      console.error(this.colorize(JSON.stringify(error, null, 2), 'dim'));
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.isDev) {
      const msg = `${this.colorize('[DEBUG]', 'magenta')} ${this.timestamp()} ${message}`;
      console.debug(msg);
      if (data) console.debug(this.colorize(JSON.stringify(data, null, 2), 'dim'));
    }
  }
}

export const logger = new Logger();
