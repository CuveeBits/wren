# Module Map
### Project: Wren — Global SMB AI Platform
*Version 0.1 — 13/03/2026*

> **This document is the constitution of the codebase.**
> > Every agent, developer, and Claude Code session must have this as context before writing any code.
> > > If your code doesn't fit cleanly into a module defined here, raise it before building.
> > >
> > > ---
> > >
> > > ## System Overview
> > >
> > > ```
> > > ┌─────────────────────────────────────────────────────────────────────────────┐
> > > │                              WREN PLATFORM                                  │
> > > │                                                                              │
> > > │  ┌──────────────────────────────────────────────────────────────────────┐   │
> > > │  │                         PRESENTATION LAYER                           │   │
> > > │  │                                                                      │   │
> > > │  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐ │   │
> > > │  │  │   Web Dashboard      │    │       Channel Adapters              │ │   │
> > > │  │  │   (Next.js 15)       │    │                                     │ │   │
> > > │  │  │                      │    │  Teams | Slack | WhatsApp | Telegram│ │   │
> > > │  │  │  - Prompt Library UI │    │  Email | WebChat widget             │ │   │
> > > │  │  │  - Agent Builder     │    │                                     │ │   │
> > > │  │  │  - KB Manager        │    │  All implement ChannelAdapter iface │ │   │
> > > │  │  │  - Workflow Builder  │    │  Inbound → MessageRouter            │ │   │
> > > │  │  │  - Chat Interface    │    │  Outbound ← Agent Runtime           │ │   │
> > > │  │  │  - Analytics         │    └─────────────────────────────────────┘ │   │
> > > │  │  │  - Admin/Settings    │                                             │   │
> > > │  │  └──────────┬──────────┘                                             │   │
> > > │  └─────────────┼────────────────────────────────────────────────────────┘   │
> > > │                │ HTTPS/WSS                    │ Webhook/Bot API              │
> > > │  ┌─────────────▼──────────────────────────────▼──────────────────────────┐  │
> > > │  │                         API LAYER (Fastify)                           │  │
> > > │  │                                                                       │  │
> > > │  │   Auth  Tenants  Agents  KB  Prompts  Workflows  Chat  Admin         │  │
> > > │  │                                                                       │  │
> > > │  │   ┌─────────────────────────────────────────────────────────────┐    │  │
> > > │  │   │                    Message Router                            │    │  │
> > > │  │   │  Inbound msg → identify tenant+user → route to agent        │    │  │
> > > │  │   └───────────────────────────┬─────────────────────────────────┘    │  │
> > > │  └───────────────────────────────┼──────────────────────────────────────┘  │
> > > │                                  │                                           │
> > > │  ┌───────────────────────────────▼──────────────────────────────────────┐  │
> > > │  │                       AGENT RUNTIME                                  │  │
> > > │  │                    (/packages/agents)                                │  │
> > > │  │                                                                      │  │
> > > │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │
> > > │  │  │   Context     │  │    Tool      │  │    Prompt Assembler      │  │  │
> > > │  │  │   Manager     │  │  Dispatcher  │  │                          │  │  │
> > > │  │  │               │  │              │  │  system_prompt +         │  │  │
> > > │  │  │  - Short-term │  │  web_search  │  │  kb_context +            │  │  │
> > > │  │  │    (Redis)    │  │  calculator  │  │  memory_context +        │  │  │
> > > │  │  │  - Long-term  │  │  email       │  │  tool_definitions        │  │  │
> > > │  │  │    (Postgres) │  │  file_ops    │  │  → final prompt          │  │  │
> > > │  │  │  - Semantic   │  │  http_call   │  │                          │  │  │
> > > │  │  │    recall     │  │  n8n_trigger │  └──────────────────────────┘  │  │
> > > │  │  └──────┬────────┘  └──────┬───────┘                               │  │
> > > │  │         │                  │                                        │  │
> > > │  │  ┌──────▼──────────────────▼─────────────────────────────────┐     │  │
> > > │  │  │                    LLM Gateway                             │     │  │
> > > │  │  │              (/packages/llm → LiteLLM proxy)              │     │  │
> > > │  │  │                                                            │     │  │
> > > │  │  │   OpenAI | Anthropic | Mistral | Ollama | AWS Bedrock     │     │  │
> > > │  │  └────────────────────────────────────────────────────────────┘     │  │
> > > │  └──────────────────────────────────────────────────────────────────────┘  │
> > > │                                                                              │
> > > │  ┌───────────────────────────────────────────────────────────────────────┐  │
> > > │  │                       KNOWLEDGE LAYER                                 │  │
> > > │  │                                                                       │  │
> > > │  │  ┌────────────────────────────┐   ┌─────────────────────────────┐   │  │
> > > │  │  │     Document Pipeline      │   │    KB Query Engine           │   │  │
> > > │  │  │                            │   │                              │   │  │
> > > │  │  │  Upload → Parse → Chunk    │   │  Query → Embed → pgvector   │   │  │
> > > │  │  │  → Embed → Store           │   │  similarity search →        │   │  │
> > > │  │  │                            │   │  rerank → return top-k      │   │  │
> > > │  │  │  PDF,DOCX,TXT,XLSX,CSV,MD  │   │                              │   │  │
> > > │  │  └────────────────────────────┘   └─────────────────────────────┘   │  │
> > > │  └───────────────────────────────────────────────────────────────────────┘  │
> > > │                                                                              │
> > > │  ┌───────────────────────────────────────────────────────────────────────┐  │
> > > │  │                      WORKFLOW ENGINE (n8n)                            │  │
> > > │  │                                                                       │  │
> > > │  │  Platform API ←→ n8n REST API (per-tenant workspace isolation)       │  │
> > > │  │  400+ integrations | Triggers: time, webhook, email, file, chat      │  │
> > > │  │  Callback: n8n → Platform API for agent-in-workflow use cases        │  │
> > > │  └───────────────────────────────────────────────────────────────────────┘  │
> > > │                                                                              │
> > > │  ┌───────────────────────────────────────────────────────────────────────┐  │
> > > │  │                      DATA LAYER                                       │  │
> > > │  │                                                                       │  │
> > > │  │  PostgreSQL 16 + pgvector    Redis 7          Cloudflare R2          │  │
> > > │  │  - All relational data       - Sessions        - Document uploads     │  │
> > > │  │  - Embeddings (pgvector)     - Hot memory       - Generated files     │  │
> > > │  │  - Audit logs                - BullMQ jobs      - Exports             │  │
> > > │  │  - RLS per tenant_id         - Rate limits      - KB source files     │  │
> > > │  └───────────────────────────────────────────────────────────────────────┘  │
> > > │                                                                              │
> > > │  ┌───────────────────────────────────────────────────────────────────────┐  │
> > > │  │                   BACKGROUND WORKER (BullMQ)                          │  │
> > > │  │                                                                       │  │
> > > │  │  kb:index  kb:embed  agent:run  notification:send  workflow:trigger   │  │
> > > │  │  report:generate    billing:meter                                     │  │
> > > │  └───────────────────────────────────────────────────────────────────────┘  │
> > > └──────────────────────────────────────────────────────────────────────────────┘
> > > ```
> > >
> > > ---
> > >
> > > ## External Services
> > >
> > > | Service | Purpose | Swap for self-hosted |
> > > |---|---|---|
> > > | Clerk | Auth, user/org management, SAML | Auth.js (custom) |
> > > | LiteLLM proxy | Unified LLM gateway | — (always self-hosted) |
> > > | Stripe | Billing, subscriptions, metered usage | — |
> > > | 360dialog | WhatsApp Business API | Twilio |
> > > | SendGrid | Transactional email | Postal (self-hosted) |
> > > | Sentry | Error tracking + performance | GlitchTip (self-hosted) |
> > > | Cloudflare R2 | File storage | MinIO (self-hosted) |
> > >
> > > ---
> > >
> > > ## Package Responsibilities
> > >
> > > ### `/apps/web` — Next.js 15 Dashboard
> > > **Owns:** All user-facing UI. Dashboard, admin, marketing pages, auth flows.
> > > **Does NOT own:** Business logic. All data mutations go through `/apps/api`.
> > > **Key pages:** Prompt Library, Agent Builder, KB Manager, Workflow Builder, Chat, Analytics, Settings/White-label.
> > >
> > > ### `/apps/api` — Fastify Backend
> > > **Owns:** All business logic, data access, auth enforcement, external service calls.
> > > **Does NOT own:** UI rendering, direct LLM calls (goes through `/packages/llm`).
> > > **Critical rule:** Every request handler validates `tenantId` from the auth context.
> > >
> > > ### `/apps/worker` — BullMQ Worker
> > > **Owns:** All async/background processing. Consumes jobs from Redis queues.
> > > **Does NOT own:** HTTP request handling.
> > > **Critical rule:** Every job processor is idempotent (safe to retry).
> > >
> > > ### `/packages/agents` — Agent Runtime
> > > **Owns:** Context assembly, LLM call orchestration, tool dispatch, memory read/write, response streaming.
> > > **Does NOT own:** Channel-specific formatting, tenant auth, HTTP routing.
> > > **Critical rule:** All methods accept `tenantId` and `userId` as required parameters.
> > >
> > > ### `/packages/channels` — Channel Adapters
> > > **Owns:** The `ChannelAdapter` interface + all implementations (Teams, Slack, WhatsApp, Telegram, Email, WebChat).
> > > **Does NOT own:** Agent logic, message routing decisions, business rules.
> > > **Critical rule:** Adapters are stateless. State lives in the API/DB layer.
> > >
> > > ### `/packages/llm` — LLM Gateway
> > > **Owns:** LiteLLM client wrapper, model registry, cost tracking helpers, token counting.
> > > **Does NOT own:** Prompt assembly, agent logic.
> > > **Critical rule:** The ONLY place in the codebase that talks to any LLM. Everything else imports from here.
> > >
> > > ### `/packages/db` — Database Layer
> > > **Owns:** Prisma schema, all migrations, seed scripts, generated client.
> > > **Does NOT own:** Business logic.
> > > **Critical rule:** RLS policies defined in migrations. `tenant_id` on all tenant-scoped tables.
> > >
> > > ### `/packages/types` — Shared Types
> > > **Owns:** TypeScript interfaces and types shared across apps and packages.
> > > **Critical rule:** No business logic here. Types only.
> > >
> > > ### `/packages/ui` — Shared Component Library
> > > **Owns:** shadcn/ui base components + any custom shared components.
> > > **Critical rule:** No API calls or business logic in components. Pure presentational.
> > >
> > > ---
> > >
> > > ## Data Flow: User Sends a Chat Message
> > >
> > > ```
> > > User (WhatsApp/Teams/Web)
> > >   → Channel Adapter (receives message, normalises to InboundMessage)
> > >   → API: POST /api/v1/chat/message
> > >   → Auth middleware (validates JWT, extracts tenantId + userId)
> > >   → Message Router (identifies agent for this session/channel)
> > >   → Agent Runtime:
> > >       1. Context Manager: fetch last 10 msgs (Redis) + top-5 memories (pgvector)
> > >       2. KB Query Engine: fetch top-k relevant chunks (pgvector)
> > >       3. Prompt Assembler: build final prompt (system + memory + KB + user msg)
> > >       4. LLM Gateway: call LiteLLM → stream response
> > >       5. Tool Dispatcher: if LLM requests tool use, execute + loop
> > >       6. Context Manager: persist new turn to Redis + Postgres
> > >   → Response streamed back to Channel Adapter
> > >   → Channel Adapter sends formatted response to user
> > >   → billing:meter job queued (tokens used, cost, tenant_id)
> > > ```
> > >
> > > ## Data Flow: User Uploads a KB Document
> > >
> > > ```
> > > User uploads file (dashboard or API)
> > >   → API: POST /api/v1/knowledge/{kbId}/documents
> > >   → Auth middleware
> > >   → File stored to R2 (returns fileUrl)
> > >   → KBDocument record created (status: PENDING)
> > >   → kb:index job queued → Worker picks up:
> > >       1. Download file from R2
> > >       2. Parse to text (pdf-parse, mammoth, etc.)
> > >       3. Chunk text (512 token chunks, 50 token overlap)
> > >       4. kb:embed jobs queued for each chunk → Worker:
> > >           a. Generate embedding via LiteLLM (text-embedding-3-small)
> > >           b. Store KBChunk with embedding vector in Postgres
> > >       5. KBDocument status → INDEXED
> > >   → User notified (WebSocket or polling)
> > > ```
> > >
> > > ## Data Flow: Workflow Execution with Agent Step
> > >
> > > ```
> > > Trigger fires (schedule / webhook / email)
> > >   → n8n executes workflow
> > >   → n8n reaches "Call Panda Agent" node
> > >   → n8n: POST /api/v1/workflows/agent-call (with tenantId, agentId, input)
> > >   → Agent Runtime executes (same flow as chat message, no streaming)
> > >   → Response returned to n8n as JSON
> > >   → n8n continues workflow with agent output
> > >   → Platform records execution, meters usage
> > > ```
> > >
> > > ---
> > >
> > > ## Core Database Tables (summary)
> > >
> > > | Table | Tenant-scoped | Purpose |
> > > |---|---|---|
> > > | `Tenant` | — | Company/org record |
> > > | `TenantUser` | ✓ | User within a tenant |
> > > | `Agent` | ✓ | AI agent configuration |
> > > | `KnowledgeBase` | ✓ | KB collection |
> > > | `KBDocument` | ✓ | Uploaded file |
> > > | `KBChunk` | ✓ | Text chunk + embedding vector |
> > > | `Prompt` | ✓ (or global) | Prompt template with form schema |
> > > | `ChatSession` | ✓ | Conversation thread |
> > > | `ChatMessage` | ✓ | Individual message + cost data |
> > > | `ChannelConfig` | ✓ | Channel connection settings |
> > > | `Workflow` | ✓ | n8n workflow metadata mirror |
> > > | `AuditLog` | ✓ | All significant actions |
> > >
> > > Full Prisma schema: see `/packages/db/schema.prisma`
> > >
> > > ---
> > >
> > > ## Module Boundaries — What NOT to Cross
> > >
> > > - `/apps/web` must never import from `/apps/api` directly. All data via HTTP/API.
> > > - - `/packages/agents` must never import from `/packages/channels`. They're parallel, both used by `/apps/api`.
> > > - - `/packages/llm` must never contain business logic. Gateway only.
> > > - - `/packages/ui` must never make API calls or import from `/apps/*`.
> > > - - Any code that needs `tenantId` must receive it as a parameter. Never derive it from global state.
> > >        
> > > - ---
> > >
> > > *Last updated: 13/03/2026 — v0.1 initial*
> > > *Next: See `docs/CONTRIBUTING.md` for coding rules, and `docs/sprints/SPRINT_0.md` for the first build spec.*
