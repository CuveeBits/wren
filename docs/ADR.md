# Architecture Decision Record (ADR)
### Project: Wren — Global SMB AI Platform
*Version 0.1 — 13/03/2026*

---

## ADR-001: Monorepo Structure

**Decision:** Single monorepo using **pnpm workspaces** with Turborepo.

**Structure:**
```
/apps
/web      → Next.js 15 frontend (dashboard + admin)
/api      → Fastify backend (core business logic)
/worker   → BullMQ background job processor
/n8n      → n8n instance (Docker, managed separately)
/packages
/db       → Prisma schema + migrations + seed
/ui       → Shared component library (shadcn/ui)
/types    → Shared TypeScript types
/config   → Shared ESLint, TypeScript, Tailwind configs
/agents   → Agent runtime library
/channels → Channel adapter library
/llm      → LiteLLM wrapper + model registry
                      ```

                      **Why:** One `git clone`, one `pnpm install`, one `docker-compose up`. Type changes propagate immediately. Claude Code can navigate the full codebase in one context window. Avoids premature microservice overhead.

                      ---

                      ## ADR-002: Frontend — Next.js 15 App Router

                      **Decision:** Next.js 15, App Router, TypeScript, Tailwind CSS, shadcn/ui.

                      **Route structure:**
                      ```
                      /app/(marketing)/           → Public pages
                      /app/(auth)/                → Login, register, invite
                      /app/(dashboard)/           → Authenticated app
                      /app/(dashboard)/[tenantSlug]/ → Tenant-scoped routes
                      /app/api/                   → BFF API routes (thin layer only)
                      ```

                      **Why shadcn/ui:** Copy-paste components (no vendor lock-in), fully customisable for white-label, Claude Code generates it reliably.

                      ---

                      ## ADR-003: Backend — Fastify on Node.js

                      **Decision:** Fastify (not Express, not NestJS), TypeScript, separate service from Next.js.

                      **API structure:**
                      ```
                      /api/v1/auth/
                      /api/v1/tenants/
                      /api/v1/agents/
                      /api/v1/knowledge/
                      /api/v1/prompts/
                      /api/v1/workflows/
                      /api/v1/chat/
                      /api/v1/channels/
                      /api/v1/admin/
                      ```

                      **Why Fastify over NestJS:** No decorator magic. Explicit route files. Predictable and readable. Agents produce consistent output with it.

                      **Why separate from Next.js:** Runs independently for workers, channel adapters, and self-hosted enterprise deployments.

                      ---

                      ## ADR-004: Database — PostgreSQL 16 + pgvector

                      **Decision:** PostgreSQL 16 as primary DB, pgvector extension for embeddings, Prisma ORM.

                      **Multi-tenancy:** Row-Level Security (RLS) + `tenant_id` on every tenant-scoped table. Even a buggy query cannot leak cross-tenant data.

                      **Why pgvector over Qdrant/Pinecone:** One less service. Handles tens of millions of vectors fine for SMB use cases. Migrate later if needed.

                      **Why Prisma:** Best TypeScript integration, readable schema files, reliable Claude Code output.

                      ---

                      ## ADR-005: LLM Routing — LiteLLM

                      **Decision:** All LLM calls go through a self-hosted **LiteLLM** proxy.

                      **CRITICAL RULE:** No code anywhere in the codebase calls OpenAI/Anthropic/etc. SDKs directly. Everything goes through `/packages/llm` → LiteLLM. Any PR violating this is rejected.

                      **Model registry** (`/packages/llm/models.ts`):
                      ```typescript
                      export const MODELS = {
                        FAST: 'gpt-4o-mini',
                        STANDARD: 'gpt-4o',
                        REASONING: 'claude-sonnet-4',
                        EMBEDDINGS: 'text-embedding-3-small',
                        LOCAL_FAST: 'ollama/llama3.2',
                        } as const
                                ```

                                Tenants can override model selection. Enterprise tenants can point to their own Ollama instance.

                                ---

                                ## ADR-006: Workflow Engine — n8n (embedded)

                                **Decision:** n8n runs as a managed sub-service. Each tenant workspace maps to an n8n workspace. Platform API proxies all workflow management to n8n's REST API.

                                **Integration pattern:**
                                - n8n as a Docker container in the stack
                                - Platform creates/manages n8n workspaces via REST API when tenant activates Workflow add-on
                                - Tenants never access n8n directly — they use the platform's workflow UI (which proxies to n8n)
                                - n8n webhooks call back into platform API when workflows need agent capabilities
                                - Execution counts tracked by platform for billing

                                **What we do NOT build:** Our own workflow execution engine. n8n does this better than we could in 12 months.

                                ---

                                ## ADR-007: Agent Runtime — Custom, Built In-House

                                **Decision:** Build our own agent runtime in `/packages/agents`. Do NOT use LangChain JS, AutoGPT, CrewAI, or similar frameworks directly.

                                **Why custom:** Multi-tenant awareness from line one. Memory scoped to tenant+user. Tool dispatch gated by tenant permissions. Model selection per-tenant config. Cannot be retrofitted onto single-user frameworks.

                                **Agent runtime responsibilities:**
                                - System prompt assembly (base + KB context + tool definitions)
                                - LLM call via LiteLLM
                                - Tool dispatch (execute approved tools, return results)
                                - Memory read/write (retrieve history, store new turns)
                                - Response streaming to channel adapters

                                **Agent runtime does NOT handle:** Channel-specific formatting, webhook routing, tenant auth.

                                ---

                                ## ADR-008: Memory — Hybrid (PostgreSQL + Redis)

                                **Decision:** Two-layer memory:

                                - **Short-term (Redis):** Active conversation context, last N messages, in-flight tool calls. TTL-based expiry.
                                - **Long-term (PostgreSQL):** Persisted history, user preference summaries, entity memory. Queried on session start.

                                **Memory retrieval on each message:**
                                1. Last 10 messages from Redis
                                2. Top-5 semantically relevant long-term memories (pgvector similarity)
                                3. Relevant KB chunks (pgvector similarity)
                                → Assembled into context window before LLM call.

                                ---

                                ## ADR-009: Channel Adapters — Custom Abstraction

                                **Decision:** Clean `ChannelAdapter` interface, each channel implemented independently. No dependency on OpenClaw code (we build our own; it's 2-3 weeks of work, not months).

                                **Interface** (`/packages/channels/types.ts`):
                                ```typescript
                                interface ChannelAdapter {
                                  id: string
                                  name: string
                                  onMessage(handler: MessageHandler): void
                                  sendMessage(recipient: ChannelRecipient, message: OutboundMessage): Promise<void>
                                  sendTyping?(recipient: ChannelRecipient): Promise<void>
                                  ping(): Promise<boolean>
                                  }
                                            ```

                                            **Build priority:**
                                            1. TeamsAdapter — highest value for German/European market
                                            2. SlackAdapter — global SMBs
                                            3. WhatsAppAdapter — via 360dialog (LATAM, Asia, Europe)
                                            4. TelegramAdapter — developers, Eastern Europe, Asia
                                            5. EmailAdapter — universal fallback
                                            6. WebChatAdapter — embedded widget for PLG onboarding

                                            **Why not fork OpenClaw:** We own the code, the license, the architecture. No upstream dependency risk. Our adapters are multi-tenant-aware from line one.

                                            ---

                                            ## ADR-010: Auth — Clerk

                                            **Decision:** Clerk for authentication (SSO, OAuth, email/password, MFA, SAML).

                                            **Why:** Built for multi-tenant SaaS. Organisation management built in. SAML/SSO for enterprise (required for German market). Saves 3+ weeks of auth plumbing.

                                            **Tenant model:**
                                            - Clerk Organization → Platform Tenant (1:1)
                                            - Clerk User → Platform User
                                            - Platform adds RBAC on top: `SUPER_ADMIN`, `TENANT_ADMIN`, `DEPT_ADMIN`, `USER`

                                            ---

                                            ## ADR-011: File Storage — Cloudflare R2

                                            **Decision:** Cloudflare R2 for all file storage (KB uploads, generated files, exports).

                                            **Why:** Zero egress fees, S3-compatible API, global CDN. For self-hosted enterprise, swap R2 for MinIO with zero code change.

                                            ---

                                            ## ADR-012: Background Jobs — BullMQ on Redis

                                            **Decision:** BullMQ for all async processing.

                                            **Queues:**
                                            - `kb:index` — Process uploaded documents
                                            - `kb:embed` — Generate embeddings for chunks
                                            - `agent:run` — Non-real-time agent execution
                                            - `notification:send` — Outbound channel messages
                                            - `workflow:trigger` — Trigger n8n executions
                                            - `report:generate` — Async report generation
                                            - `billing:meter` — Track usage for billing

                                            ---

                                            ## ADR-013: Infrastructure — Docker Compose + Railway/VPS

                                            **Docker Compose services (dev + self-hosted):**
                                            ```
                                            postgres    → PostgreSQL 16 + pgvector
                                            redis       → Redis 7
                                            n8n         → n8n instance
                                            litellm     → LiteLLM proxy
                                            mailhog     → Local email testing
                                            minio       → Local S3 (R2 replacement for dev)
                                            ```

                                            **Production:** Railway initially. Migrate to bare VPS or Kubernetes when enterprise customers require dedicated hosting.

                                            **Self-hosted enterprise edition:** Same Docker Compose file, environment variables pointing to customer infra. One command. This is what you sell to German accounts who won't put data in your cloud.

                                            ---

                                            ## ADR-014: Observability — OpenTelemetry + Sentry

                                            **Decision:** OpenTelemetry for traces/metrics, Sentry for error tracking.

                                            **Non-negotiable instrumentation on every:**
                                            - LLM call: model, tokens in/out, latency, cost, tenant_id
                                            - KB query: query, top-k results, latency, tenant_id
                                            - Channel message: channel type, direction, agent_id, tenant_id
                                            - Workflow execution: workflow_id, status, duration, tenant_id
                                            - API request: route, status, latency, tenant_id

                                            **Why this matters early:** Per-tenant cost visibility is required to price correctly and catch runaway usage before it hits the bill.

                                            ---

                                            ## ADR-015: White-Label Architecture

                                            **Decision:** White-label is first-class tenant configuration, not a separate product tier.

                                            ```typescript
                                            interface WhiteLabelConfig {
                                            brandName: string
                                            logoUrl: string
                                            primaryColor: string
                                            customDomain?: string
                                            emailFromName?: string
                                            emailFromAddress?: string
                                            hideParentBrand: boolean
                                            customCss?: string
                                            }
                                                            ```

                                                            **Custom domain routing:** Middleware reads hostname → resolves tenant → renders with their branding.

                                                            **Why first-class:** Required for German SI reseller channel strategy. Non-negotiable for Phase 1.

                                                            ---

                                                            ## ADR-016: Prompt Template System

                                                            **Decision:** Prompts are stored as Handlebars templates with a JSON Schema form definition.

                                                            ```typescript
                                                            interface Prompt {
                                                            title: string
                                                            department: string
                                                            category: string
                                                            formSchema: JSONSchema7   // drives the adaptive form UI
                                                            promptTemplate: string    // Handlebars template, vars from form
                                                            difficulty: 'beginner' | 'intermediate' | 'advanced'
                                                            estimatedMinutesSaved: number
                                                            }
                                                                          ```

                                                                          The form renderer reads `formSchema` and generates the UI dynamically. On submit, Handlebars merges form data into `promptTemplate` to produce the final prompt sent to the agent.

                                                                          **Why Handlebars:** Simple, well-understood, safe (no code execution), Claude Code generates valid templates reliably.

                                                                          ---

                                                                          ---

## ADR-017: Tenant-Configurable Model Selection

**Decision:** Model selection is a first-class tenant configuration. Each tenant can choose from three model source types depending on their subscription tier. All routing flows through LiteLLM — no exceptions (see ADR-005).

---

### Model Source Types

| Source | Description | Who pays inference | Tier |
|--------|-------------|-------------------|------|
| **Wren-hosted** | CuveeBits runs inference (cloud APIs under our keys, or Ollama on our iron). Tenant picks from a curated list — no config required. | CuveeBits (included in subscription) | Starter + |
| **BYOK** (Bring Your Own Key) | Tenant provides their own API key (OpenAI, Anthropic, Gemini, Mistral, etc.). Encrypted at rest, never logged. Usage goes against their quota. | Tenant | Growth + |
| **BYOE** (Bring Your Own Endpoint) | Tenant provides a URL to their own Ollama instance, vLLM, or any OpenAI-compatible endpoint. Optional bearer token. Air-gap friendly. | Tenant (self-hosted) | Enterprise |

---

### Data Model

New tables in `/packages/db/prisma/schema.prisma`:

```prisma
// Catalogue of models available on the platform
model ModelDefinition {
  id           String   @id @default(cuid())
  slug         String   @unique          // e.g. "wren-fast", "openai/gpt-4o", "ollama/qwen2.5:7b"
  displayName  String                    // e.g. "Wren Fast (powered by Qwen 2.5)"
  provider     String                    // "wren-hosted" | "openai" | "anthropic" | "ollama" | "custom"
  sourceType   ModelSourceType           // WREN_HOSTED | BYOK | BYOE
  contextWindow Int?
  capabilities String[]                  // ["chat", "embeddings", "vision"]
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  tenantModels TenantModel[]
}

enum ModelSourceType {
  WREN_HOSTED
  BYOK
  BYOE
}

// Per-tenant model configuration
model TenantModel {
  id             String          @id @default(cuid())
  tenantId       String
  modelId        String
  isEnabled      Boolean         @default(true)
  isDefault      Boolean         @default(false)   // default model for this tenant
  apiKeyEncrypted String?        // AES-256-GCM, null for WREN_HOSTED
  endpointUrl    String?         // BYOE only
  displayNameOverride String?    // tenant can rename "GPT-4o" to "Company Assistant"
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  model          ModelDefinition @relation(fields: [modelId], references: [id])

  @@unique([tenantId, modelId])
  @@index([tenantId])
}
```

---

### LiteLLM Routing

LiteLLM is configured dynamically per-request using **virtual keys** and **per-request model routing**:

- **Wren-hosted:** Routes to a pre-configured LiteLLM model alias (`wren-fast`, `wren-standard`, etc.). CuveeBits manages the underlying keys in LiteLLM config.
- **BYOK:** API key is decrypted at request time and passed as `api_key` in the LiteLLM call. The tenant's key, the tenant's bill.
- **BYOE:** `api_base` is set to the tenant's endpoint URL. Compatible with any OpenAI-spec server (Ollama, vLLM, LM Studio, etc.).

All routing happens in `/packages/llm`. The API layer never touches a raw API key — it calls `llm.complete({ tenantId, modelSlug, messages })` and the package handles resolution.

---

### Encryption

Tenant API keys are encrypted before storage:
- Algorithm: AES-256-GCM
- Key derivation: per-tenant key derived from a master secret + tenant ID (HKDF)
- Keys are decrypted in memory at request time only — never logged, never returned via API
- Stored in `TenantModel.apiKeyEncrypted`

---

### Subscription Tier Access

| Tier | Wren-hosted | BYOK | BYOE | Max models |
|------|------------|------|------|------------|
| Starter | ✅ (curated 2-3) | ❌ | ❌ | 3 |
| Growth | ✅ | ✅ | ❌ | 10 |
| Enterprise | ✅ | ✅ | ✅ | Unlimited |

Tier enforcement is in the API plugin layer, not in the LLM package.

---

### Admin UI (Tenant Settings → Models)

Located at `/[tenantSlug]/settings/models`:

- **Wren-hosted tab:** Toggle on/off available platform models. Mark one as default.
- **Cloud Keys tab (Growth+):** Add/remove API keys per provider. Key value masked after entry. Connection test button.
- **Private Endpoints tab (Enterprise):** Add Ollama/vLLM URLs. Name them. Test connectivity. Enable/disable per model slug.

---

### Prompt Execution Model Selection

When a tenant executes a prompt:
1. Prompt definition may specify a preferred `modelHint` (e.g. `"reasoning"` or `"fast"`)
2. The API resolves `modelHint` → `TenantModel` for that tenant
3. If no match or disabled, falls back to tenant's default model
4. If no default, falls back to platform default (`wren-fast`)

This lets templates be portable across tenants regardless of their model choices.

---

### Why This Matters for SMB

- **Cost control:** SMBs can start on Wren-hosted (flat fee, predictable) and graduate to BYOK as usage scales
- **Data sovereignty:** German/EU enterprise accounts can run BYOE against an on-prem Ollama — no data leaves their network
- **Competitive moat:** Lock-in is avoided deliberately. If a tenant loves their local Mistral model, Wren works with it. Trust wins over lock-in.
- **Future: model marketplace:** As open-source models mature, Wren-hosted tiers can be repriced or expanded without changing the tenant-facing API

---

*Last updated: 14/03/2026 — v0.2 — added ADR-017*
