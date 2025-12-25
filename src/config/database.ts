// lib/prisma.ts
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// Get connection string
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create adapter and client
const adapter = new PrismaPg({ connectionString })

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
})

// Event handlers
prisma.$on('query', (e: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    })
  }
})

prisma.$on('error', (e: any) => {
  logger.error('Prisma Error', { target: e.target, message: e.message })
})

prisma.$on('info', (e: any) => {
  logger.info('Prisma Info', { target: e.target, message: e.message })
})

prisma.$on('warn', (e: any) => {
  logger.warn('Prisma Warning', { target: e.target, message: e.message })
})

// Connection functions
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect()
    logger.info('✅ Database connected successfully')
  } catch (error) {
    logger.error('❌ Database connection failed', { error })
    throw error
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect()
    logger.info('Database disconnected successfully')
  } catch (error) {
    logger.error('Database disconnection failed', { error })
  }
}