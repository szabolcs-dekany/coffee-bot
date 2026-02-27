import pino, { Logger } from 'pino'

/**
 * Creates a configured pino logger instance for a module
 * @param moduleName - The name of the module (will be prefixed with 'coffee-bot-')
 * @returns A configured Logger instance
 */
export function createLogger(moduleName: string): Logger {
  return pino({
    name: `coffee-bot-${moduleName}`,
    level: process.env.LOG_LEVEL || 'debug',
    transport: {
      target: 'pino-pretty',
    },
  })
}
