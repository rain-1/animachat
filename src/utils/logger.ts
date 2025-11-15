/**
 * Structured logging with pino
 * Supports per-activation file logging
 */

import pino from 'pino'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { join } from 'path'

const isDevelopment = process.env.NODE_ENV !== 'production'
const logDir = process.env.LOG_DIR || './logs/activations'

// Ensure log directory exists
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

// Base logger for console output
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

// General log file for non-activation logs
const generalLogPath = join(logDir, 'general.log')
const generalLogStream = createWriteStream(generalLogPath, { flags: 'a' })
const generalFileLogger = pino({
  level: 'debug',
}, generalLogStream)

// Track current activation context
let currentActivationLogger: pino.Logger | null = null
let currentActivationId: string | null = null

/**
 * Main logger - routes to console + general file OR activation file
 */
export const logger = new Proxy(baseLogger, {
  get(target, prop: string) {
    if (['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop)) {
      return (...args: any[]) => {
        // Log to console
        (target as any)[prop](...args)
        
        // Log to file
        if (currentActivationLogger) {
          // Inside activation - log to activation file
          (currentActivationLogger as any)[prop](...args)
        } else {
          // Outside activation - log to general file
          (generalFileLogger as any)[prop](...args)
        }
      }
    }
    return (target as any)[prop]
  }
})

/**
 * Start logging to an activation-specific file
 */
export function startActivationLogging(channelId: string, messageId: string): void {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `${channelId}-${messageId}-${timestamp}.log`
  const filePath = join(logDir, filename)
  
  const stream = createWriteStream(filePath, { flags: 'a' })
  currentActivationLogger = pino({
    level: 'debug',
  }, stream)
  
  currentActivationId = `${channelId}:${messageId}`
  
  logger.debug({ channelId, messageId, logFile: filename }, 'Started activation logging')
}

/**
 * Stop activation logging and return to general logging
 */
export function stopActivationLogging(): void {
  if (currentActivationLogger) {
    logger.debug({ activationId: currentActivationId }, 'Stopped activation logging')
    currentActivationLogger = null
    currentActivationId = null
  }
}

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context)
}

/**
 * Log levels for convenience
 */
export const log = {
  trace: logger.trace.bind(logger),
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
}

