# @wren/llm — LLM Gateway

## What this module owns
- LiteLLM client wrapper (`src/client.ts`)
- Model registry (`src/models.ts`) — canonical list of model IDs
- Cost calculation helpers (Sprint 2)
- Token counting utilities (Sprint 2)

## What it does NOT do
- Prompt assembly (that's `@wren/agents`)
- Agent orchestration (that's `@wren/agents`)
- Direct calls to OpenAI/Anthropic — all calls go through LiteLLM proxy

## CRITICAL RULE (ADR-005)
**This is the ONLY place in the codebase that talks to any LLM.**
Every other package and app imports from `@wren/llm`.
Never `import OpenAI from 'openai'` anywhere else.

## Public interface (key exports)

```typescript
import { MODELS, createLiteLLMClient } from '@wren/llm'

const llm = createLiteLLMClient({
  baseUrl: config.litellmBaseUrl,
  apiKey: config.litellmApiKey,
})

const response = await llm.chat({
  model: MODELS.STANDARD,
  messages: [{ role: 'user', content: 'Hello' }],
  tenantId,
})
```

## Non-obvious decisions
- **Uses OpenAI SDK pointed at LiteLLM:** This is NOT a violation of Rule 2. LiteLLM exposes an OpenAI-compatible API. We use the OpenAI SDK as an HTTP client only; the actual provider (OpenAI/Anthropic/Mistral) is configured in `litellm.config.yaml`.
- **`costUsd` is always returned:** Sprint 0 returns 0. Sprint 2 implements real cost calculation. Rule 10 requires this field on every response.
