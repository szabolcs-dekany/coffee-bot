import pino from 'pino'

export function createLogger(moduleName: string) {
  return pino({
    name: `coffee-bot-${moduleName}`,
    level: process.env.LOG_LEVEL || 'debug',
    transport: {
      target: 'pino-pretty',
    },
  })
}
