/**
 * Winston Logger Configuration
 * Structured logging with different levels and formats
 */

import winston from 'winston';
import { config, isDevelopment } from '../config';

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Format for production (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: isDevelopment ? developmentFormat : productionFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      silent: config.NODE_ENV === 'test',
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Export convenience methods
export default {
  debug: (message: string, meta?: object) => logger.debug(message, meta),
  info: (message: string, meta?: object) => logger.info(message, meta),
  warn: (message: string, meta?: object) => logger.warn(message, meta),
  error: (message: string, meta?: object) => logger.error(message, meta),
};
