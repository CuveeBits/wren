# Architecture Decision Record (ADR)
### Project: Panda — Global SMB AI Platform
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

                                                                          *Last updated: 13/03/2026 — v0.1 initial*
