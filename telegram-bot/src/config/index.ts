/**
 * Bot Configuration
 * Centralized configuration management with environment variable validation
 */

import { z } from 'zod';

const configSchema = z.object({
  // Telegram Bot
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),

  // API URLs
  RELAYER_API_URL: z.string().url('RELAYER_API_URL must be a valid URL'),
  MINI_APP_URL: z.string().url('MINI_APP_URL must be a valid URL'),
  WEBAPP_URL: z.string().url('WEBAPP_URL must be a valid URL'),

  // Environment
  NODE_ENV: z.enum(['development', 'production']).default('development'),

  // Database
  DATABASE_URL: z.string().default('file:./dev.db'),
});

export type Config = z.infer<typeof configSchema>;

// Load and validate configuration
function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid configuration:');
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    throw new Error('Configuration validation failed');
  }

  return result.data;
}

export const config = loadConfig();

// Helper to get environment-specific settings
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
