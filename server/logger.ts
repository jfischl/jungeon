import pino from 'pino';

/**
 * Logger Service - Centralized structured logging
 *
 * Log Levels:
 * - fatal: Application is unusable
 * - error: Error events that might still allow the application to continue
 * - warn: Warning events (potential issues)
 * - info: Informational messages (default)
 * - debug: Debug information
 * - trace: Very detailed debug information
 *
 * Environment Variables:
 * - LOG_LEVEL: Set logging level (default: 'info')
 * - NODE_ENV: When 'test', sets level to 'silent'
 */

const logger = pino({
    level: process.env.NODE_ENV === 'test'
        ? 'silent'
        : (process.env.LOG_LEVEL || 'info'),
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
        : undefined
});

export default logger;

// Convenience exports for different contexts
export const gameLogger = logger.child({ module: 'game' });
export const combatLogger = logger.child({ module: 'combat' });
export const playerLogger = logger.child({ module: 'player' });
export const serverLogger = logger.child({ module: 'server' });
