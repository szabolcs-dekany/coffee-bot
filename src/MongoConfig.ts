import mongoose from 'mongoose'
import { config } from './config'
import { createLogger } from './utils/logger'

const logger = createLogger('mongo-config')

export async function connect() {
  try {
    await mongoose.connect(config.MONGODB_URI || '')
    logger.info('Connected to MongoDB 🌱')
  } catch (error) {
    logger.error('Connection error:', error)
    throw new Error(`Connection error: ${error}`)
  }
}
