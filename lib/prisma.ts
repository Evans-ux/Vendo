/**
 * lib/prisma.ts
 *
 * Prisma singleton using the pg driver adapter.
 * NEVER import this file in middleware (proxy.ts) or any Edge runtime code.
 * Edge runtime does not support Node.js modules like pg or Prisma's native engine.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// PrismaPg v7 accepts a connection string, Pool, or PoolConfig directly
const adapter = new PrismaPg(process.env.DATABASE_URL!)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
