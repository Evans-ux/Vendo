/**
 * lib/prisma.ts
 *
 * Prisma singleton using the pg connection pool adapter.
 * NEVER import this file in middleware (proxy.ts) or any Edge runtime code.
 * Edge runtime does not support Node.js modules like pg or Prisma's native engine.
 */
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL!

const pool = new Pool({ connectionString })

// @ts-ignore — PrismaPg adapter has a minor type mismatch with the Pool interface
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
