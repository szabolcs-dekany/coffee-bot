import mongoose from 'mongoose'
import { config } from './config'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-mongo-config',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export async function connect() {
  try {
    await mongoose.connect(config.MONGODB_URI || '')
    logger.info('Connected to MongoDB 🌱')
  } catch (error) {
    logger.error('Connection error:', error)
    throw new Error(`Connection error: ${error}`)
  }
}
