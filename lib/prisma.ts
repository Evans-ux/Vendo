/**
 * lib/prisma.ts
 * 
 * This file sets up the Prisma Client and explicitly uses the Supabase
 * connection pool URL securely from the environment.
 * The Pg Adapter securely manages connections to avoid exhausting database concurrency.
 */
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Connect to Supabase via transaction pooler (port 6543)
const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
// Bypass strict pg pooling interface from adapter
// @ts-ignore
const adapter = new PrismaPg(pool)

// Create a singleton prisma client
// Learn more about singletons in Next.js: https://pris.ly/d/help/nextjs-best-practices
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
