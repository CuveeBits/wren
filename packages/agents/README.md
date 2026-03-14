# @wren/agents — Agent Runtime

## What this module owns
- Context assembly (short-term memory from Redis + long-term from Postgres + KB chunks)
- LLM call orchestration via `@wren/llm`
- Tool dispatch (execute approved tools, return results to LLM)
- Memory read/write (Redis short-term + Postgres long-term)
- Response streaming to channel adapters

## What it does NOT do
- Channel-specific formatting (that's `@wren/channels`)
- Tenant authentication (that's `@wren/api/plugins/auth`)
- HTTP routing (that's `@wren/api`)
- Direct LLM SDK calls (uses `@wren/llm` exclusively)

## Public interface (key exports)
Sprint 0: stub only. See Sprint 2 spec for full interface.

```typescript
// Sprint 2 target interface:
import { AgentRuntime } from '@wren/agents'

const runtime = new AgentRuntime({ tenantId, agentId, config })
const response = await runtime.run({ userId, message, channelType })
```

## Non-obvious decisions
- **Multi-tenant from line one:** Custom runtime (not LangChain/CrewAI) because third-party frameworks are not multi-tenant-aware. Our runtime has `tenantId` and `userId` in every method signature from the start (ADR-007).
- **Tool dispatch is gated:** Tools available to an agent are configured per-tenant in the DB (`Agent.tools` array). The dispatcher checks this list before executing any tool.
- **Memory is two-layer:** Redis for last N messages (fast, TTL-based), Postgres+pgvector for long-term semantic recall (ADR-008).
