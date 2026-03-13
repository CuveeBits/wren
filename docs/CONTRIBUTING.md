# Contributing to Panda

> These rules apply to **every contributor** — human developers, Claude Code, and all AI coding agents.
> > Read the [ADR](./ADR.md) and [MODULE_MAP](./MODULE_MAP.md) before writing a single line of code.
> >
> > ---
> >
> > ## The 10 Non-Negotiable Rules
> >
> > These are the rules that keep the codebase coherent across sprints, agents, and contributors.
> > Any PR that violates these rules is rejected, no exceptions.
> >
> > ### Rule 1: Every database query includes `tenantId`
> >
> > Every query on a tenant-scoped table MUST filter by `tenantId`. No exceptions.
> > If you're writing a query without a tenant filter, stop and explain why in a comment.
> >
> > ```typescript
> > // ✅ CORRECT
> > const agents = await db.agent.findMany({
> >   where: { tenantId, isActive: true }
> > })
> >
> > // ❌ REJECTED — missing tenantId filter
> > const agents = await db.agent.findMany({
> >   where: { isActive: true }
> > })
> > ```
> >
> > ### Rule 2: No direct LLM SDK calls
> >
> > All LLM calls go through `/packages/llm`. Never import from `openai`, `@anthropic-ai/sdk`, or any other LLM SDK directly.
> >
> > ```typescript
> > // ✅ CORRECT
> > import { llm } from '@panda/llm'
> > const response = await llm.chat({ model: MODELS.STANDARD, messages, tenantId })
> >
> > // ❌ REJECTED
> > import OpenAI from 'openai'
> > const openai = new OpenAI()
> > ```
> >
> > ### Rule 3: All API endpoints require auth middleware
> >
> > Every Fastify route must have auth middleware applied. Public endpoints must be explicitly marked with a `// PUBLIC ENDPOINT — reason:` comment and reviewed.
> >
> > ```typescript
> > // ✅ CORRECT
> > fastify.get('/agents', { preHandler: [authenticate] }, handler)
> >
> > // ✅ CORRECT — explicitly public
> > // PUBLIC ENDPOINT — reason: webhook receiver, auth via HMAC signature
> > fastify.post('/webhooks/teams', handler)
> >
> > // ❌ REJECTED — no auth, no explanation
> > fastify.get('/agents', handler)
> > ```
> >
> > ### Rule 4: TypeScript strict mode, no `any`
> >
> > `tsconfig.json` has `strict: true`. Use `unknown` and narrow properly. Use Zod for all external data (API inputs, webhook payloads, env vars).
> >
> > ```typescript
> > // ✅ CORRECT
> > const body = CreateAgentSchema.parse(request.body)
> >
> > // ❌ REJECTED
> > const body = request.body as any
> > ```
> >
> > ### Rule 5: Slow operations go through BullMQ
> >
> > Any operation that could take >500ms must be queued via BullMQ and processed in the worker. Do not block a request handler for document indexing, report generation, batch operations, or embedding generation.
> >
> > ```typescript
> > // ✅ CORRECT
> > await kbIndexQueue.add('index-document', { documentId, tenantId })
> > return { status: 'queued', documentId }
> >
> > // ❌ REJECTED — blocking the request handler
> > await indexDocument(documentId, tenantId)  // takes 30 seconds
> > return { status: 'done' }
> > ```
> >
> > ### Rule 6: Channel adapters are stateless
> >
> > `/packages/channels` adapters receive messages and send messages. They do not store state, make business decisions, or call the database directly. State lives in the API and database layer.
> >
> > ### Rule 7: Environment variables only in config files
> >
> > Never access `process.env` scattered through the codebase. All env vars are read and validated once, in the config module of each app.
> >
> > ```typescript
> > // ✅ CORRECT — in apps/api/src/config.ts
> > export const config = {
> >   databaseUrl: z.string().url().parse(process.env.DATABASE_URL),
> >   redisUrl: z.string().url().parse(process.env.REDIS_URL),
> > }
> >
> > // ❌ REJECTED — anywhere else
> > const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
> > ```
> >
> > ### Rule 8: Every new module gets a README.md
> >
> > Every new package or significant module must include a `README.md` that explains:
> > - What this module owns
> > - - What it explicitly does NOT do
> >   - - Its public interface (key exports)
> >     - - Any non-obvious decisions made
> >      
> >       - ### Rule 9: Feature flags for everything in progress
> >      
> >       - Unfinished features ship behind a feature flag, never as dead code or commented-out code.
> >      
> >       - ```typescript
> > // ✅ CORRECT
> > if (await isFeatureEnabled('whatsapp-adapter', tenantId)) {
> >   // WhatsApp-specific code
> > }
> >
> > // ❌ REJECTED
> > // TODO: enable this later
> > // const whatsapp = new WhatsAppAdapter()
> > ```
> >
> > ### Rule 10: Cost tracking on every LLM call
> >
> > The `costUsd` and `tokenCount` fields on `ChatMessage` must always be populated. If cost calculation fails, log a warning with enough context to debug — never silently drop it.
> >
> > ```typescript
> > // ✅ CORRECT
> > await db.chatMessage.create({
> >   data: {
> >     ...messageData,
> >     tokenCount: response.usage.total_tokens,
> >     costUsd: calculateCost(response.usage, model),
> >   }
> > })
> > ```
> >
> > ---
> >
> > ## Code Style
> >
> > - **Formatter:** Prettier (config in `/packages/config/prettier.config.js`)
> > - - **Linter:** ESLint with TypeScript rules (config in `/packages/config/eslint.config.js`)
> >   - - **Naming:** `camelCase` for variables/functions, `PascalCase` for types/classes, `UPPER_SNAKE` for constants
> >     - - **Imports:** Absolute imports using workspace package names (`@panda/db`, `@panda/types`, etc.)
> >       - - **Error handling:** Use typed error classes, not string throws. Never swallow errors silently.
> >         - - **Comments:** Explain *why*, not *what*. The code shows what. Comments explain intent and non-obvious decisions.
> >          
> >           - ---
> >
> > ## Commit Convention
> >
> > Follow [Conventional Commits](https://www.conventionalcommits.org/):
> >
> > ```
> > feat(agents): add tool dispatcher with web_search support
> > fix(kb): handle empty PDF files gracefully
> > chore(deps): update prisma to 5.10
> > docs(adr): add ADR-017 for rate limiting strategy
> > refactor(channels): extract base adapter class
> > test(api): add integration tests for tenant isolation
> > ```
> >
> > ---
> >
> > ## Sprint Process
> >
> > 1. **Spec first:** Every sprint starts with a spec in `docs/sprints/SPRINT_N.md`
> > 2. 2. **Read the ADR and Module Map** before starting any implementation
> >    3. 3. **Branch:** `sprint/N-short-description` (e.g., `sprint/0-repo-scaffold`)
> >       4. 4. **Build:** Implement against the spec. One commit per logical unit.
> >          5. 5. **Review:** All code reviewed against the 10 rules above before merge
> >             6. 6. **Document:** Update relevant docs if architectural decisions change
> >                7. 7. **Merge to main:** Clean, passing tests, no rule violations
> >                  
> >                   8. ---
> >                  
> >                   9. ## For AI Coding Agents (Claude Code, local models via Ollama, etc.)
> >                  
> >                   10. When you receive a task:
> >
> > 1. **Read first:** Load `docs/ADR.md` and `docs/MODULE_MAP.md` into context
> > 2. 2. **Identify the module:** Confirm where your code belongs in the module map
> >    3. 3. **Check the rules:** Before submitting, verify all 10 rules are satisfied
> >       4. 4. **Scope strictly:** Only build what the sprint spec asks for. No scope creep.
> >          5. 5. **When uncertain:** Add a `// TODO(review): [your question]` comment rather than guessing
> >             6. 6. **Test your work:** Include tests for the logic you build. No untested code ships.
> >               
> >                7. ---
> >               
> >                8. *Last updated: 13/03/2026 — v0.1 initial*
