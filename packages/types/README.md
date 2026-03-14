# @wren/types — Shared TypeScript Types

## What this module owns
- TypeScript interfaces and types shared across all apps and packages
- Fastify type augmentation (`request.auth`)

## What it does NOT do
- Business logic of any kind
- Runtime validation (use Zod in the consuming app/package)
- API calls

## Public interface (key exports)

```typescript
import type { AuthContext, UserRole, WhiteLabelConfig } from '@wren/types'
```

## Non-obvious decisions
- **Types only, no runtime code:** This package has zero runtime dependencies. Everything here is `type` or `interface`. Use Zod schemas in the consuming apps for runtime validation.
- **Fastify augmentation:** The `declare module 'fastify'` block in `auth.ts` augments Fastify's `FastifyRequest` type globally so `request.auth` is typed everywhere in `@wren/api`.
