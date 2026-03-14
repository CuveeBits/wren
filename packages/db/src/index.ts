/**
 * @wren/db — Database layer.
 * Re-exports the Prisma client singleton for use across apps.
 *
 * Rule 1 (CONTRIBUTING.md): Every query on a tenant-scoped table MUST filter by tenantId.
 * This module owns the Prisma schema, migrations, and seed scripts.
 * It does NOT contain business logic.
 */
import { PrismaClient } from '@prisma/client'

// Singleton pattern: reuse client across hot-reloads in dev (avoids connection exhaustion)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = db
}

export { PrismaClient }
export * from '@prisma/client'
