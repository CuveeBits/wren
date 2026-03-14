# @wren/db — Database Layer

## What this module owns
- Prisma schema (`prisma/schema.prisma`) — all tables, enums, and relations
- Database migrations (in `prisma/migrations/`)
- Seed script (`prisma/seed.ts`) — creates demo tenant for development
- Prisma client singleton (exported from `src/index.ts`)

## What it does NOT do
- Business logic of any kind
- Validation beyond Prisma-level constraints
- Auth decisions

## Public interface (key exports)

```typescript
import { db } from '@wren/db'
import type { Tenant, Agent, ChatMessage } from '@wren/db'

// Rule 1: Always include tenantId in queries
const agents = await db.agent.findMany({
  where: { tenantId, isActive: true },
})
```

## Commands

```bash
pnpm db:migrate    # Run migrations against local Postgres
pnpm db:seed       # Seed demo data (set SEED_CLERK_USER_ID first)
pnpm db:studio     # Open Prisma Studio (DB browser)
```

## Non-obvious decisions
- **pgvector extension:** `KBChunk.embedding` uses `Unsupported("vector(1536)")`. Requires `pgvector/pgvector:pg16` Docker image, not plain `postgres:16`.
- **RLS planned for Sprint 2:** Row-Level Security policies will be added in migrations in Sprint 2. `tenant_id` indexes are in place for query performance now.
- **Global Prisma singleton:** The `db` export reuses a single `PrismaClient` instance across hot-reloads to avoid connection pool exhaustion in development.
