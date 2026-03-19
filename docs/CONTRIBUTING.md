# Contributing to Wren

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
import { llm } from '@wren/llm'
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
> > - - Its public interface (key exports)
> > - - Any non-obvious decisions made
> >      
> >   - ### Rule 9: Feature flags for everything in progress
> >      
> >   - Unfinished features ship behind a feature flag, never as dead code or commented-out code.
> >      
> >   - ```typescript
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
> > - - **Naming:** `camelCase` for variables/functions, `PascalCase` for types/classes, `UPPER_SNAKE` for constants
> > - - **Imports:** Absolute imports using workspace package names (`@wren/db`, `@wren/types`, etc.)
> > - - **Error handling:** Use typed error classes, not string throws. Never swallow errors silently.
> > - - **Comments:** Explain *why*, not *what*. The code shows what. Comments explain intent and non-obvious decisions.
> >         
> > - ---
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
> > 3. 3. **Branch:** `sprint/N-short-description` (e.g., `sprint/0-repo-scaffold`)
> > 4. 4. **Build:** Implement against the spec. One commit per logical unit.
> > 5. 5. **Review:** All code reviewed against the 10 rules above before merge
> > 6. 6. **Document:** Update relevant docs if architectural decisions change
> > 7. 7. **Merge to main:** Clean, passing tests, no rule violations
> >                  
> > 8. ---
> >                 
> > 9. ## For AI Coding Agents (Claude Code, local models via Ollama, etc.)
> >                  
> > 10. When you receive a task:
> >
> > 1. **Read first:** Load `docs/ADR.md` and `docs/MODULE_MAP.md` into context
> > 2. 2. **Identify the module:** Confirm where your code belongs in the module map
> > 3. 3. **Check the rules:** Before submitting, verify all 10 rules are satisfied
> > 4. 4. **Scope strictly:** Only build what the sprint spec asks for. No scope creep.
> > 5. 5. **When uncertain:** Add a `// TODO(review): [your question]` comment rather than guessing
> > 6. 6. **Test your work:** Include tests for the logic you build. No untested code ships.
> >               
> > 7. ---
> >               
> >                8. *Last updated: 13/03/2026 — v0.1 initial*

---

## Rule 11: Never overwrite an existing file — always extend

Before touching any file, read it and understand what it does.
If a file already exists and works: **add to it, do not replace it.**
If you believe a file needs to be fully replaced: stop, explain why in a comment to your brief, and wait for explicit sign-off.

This rule exists because Sprint 4 overwrote the Sprint 3 chat page and KB, breaking everything that had been built and tested. It will not happen again.

```typescript
// ✅ CORRECT — add a new route to an existing route file
export async function chatRoutes(fastify: FastifyInstance) {
  // ... existing routes untouched ...

  // NEW: Sprint 4 translation settings
  fastify.get('/settings/:tenantId', ...)
}

// ❌ REJECTED — creating a new file that duplicates/replaces an existing one
// apps/api/src/routes/chat-v2.ts  ← never do this
```

### For frontend pages specifically:
- If `/[tenantSlug]/chat/page.tsx` exists: extend it
- If `shell.tsx` has nav links: add to the array, do not rewrite the component
- If a component already renders something: add props/state, do not replace the render

---

## Rule 12: Cumulative testing — every sprint, every time

Rex (or any tester) runs the **full cumulative Playwright suite** on every sprint, without exception.

- Sprint 1 spec + Sprint 2 spec + Sprint 3 spec + ... + Sprint N spec — all of them, every time
- All previous sprints must pass before the new sprint's results mean anything
- Test files live in `tests/rex/`: `sprint-1.spec.ts`, `sprint-2.spec.ts`, etc.
- Previous test files are **never modified or deleted**
- If a previous sprint test breaks: it is a CRIT blocker on the new sprint, not a known issue
- If the full suite takes 4 hours, it takes 4 hours

Report format: `Sprint 1 ✅ · Sprint 2 ✅ · Sprint 3 ✅ · Sprint N [result]`

A sprint is not done until ALL sprints pass — not just the new one.

---

*Rules 11-12 added 2026-03-20 after Sprint 4 regression incident*

---

## Rule 13: DB migrations are code — they ship with the sprint

 is for local development exploration only. It NEVER runs on the lab or production.

Every schema change must have a proper migration file in . If there is no migration file, the schema change does not exist for anyone else.

```bash
# ✅ CORRECT — creates a migration file, tracks the change
pnpm --filter @wren/db exec prisma migrate dev --name sprint4_translation_fields

# ❌ REJECTED on lab/prod — no migration file created, schema drifts
prisma db push
```

To verify: `prisma migrate status` must report No pending migrations on the lab before any test run. If it reports pending migrations: stop, investigate, do not test.

---

## Rule 14: No silent fallbacks for required environment variables

If an environment variable is required for the app to function, throw a clear error at startup if it is missing. Never use `?? localhost:something` as a fallback — it hides deployment problems until the moment they cause a user-visible failure.

```typescript
// ✅ CORRECT — fails loudly at startup
const API_BASE = process.env['NEXT_PUBLIC_API_URL']
if (!API_BASE) throw new Error('NEXT_PUBLIC_API_URL is required')

// ❌ REJECTED — silently points at localhost when deployed remotely
const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
```

This rule exists because a hardcoded `localhost:3001` fallback caused Load failed errors when the app was accessed from a browser on a different machine — the failure only appeared at runtime, not at build time.

---

## Rule 15: Sprint branch always forks from the previous sprint's tip

Before creating a new sprint branch, identify the exact last commit of the previous sprint:

```bash
# ✅ CORRECT
git log sprint/3-chat-interface --oneline -1
# → e588c3e chore(snapshot): Sprint 3 golden DB snapshot
git checkout -b sprint/4-auto-translate e588c3e

# ❌ REJECTED — branching from an arbitrary/init commit drops all previous work
git checkout -b sprint/4-auto-translate cb1951b  # init commit — missing all of Sprint 3
```

If sprint/N does not contain all the code from sprint/N-1, features will be silently missing. This is what caused the Sprint 4 regression — the branch was created from an init commit, not from the Sprint 3 tip.

---

## Rule 16: Lab deployment checklist — runs before Rex, every time

No exceptions. Francis or the deploying agent runs this before briefing Rex:

```bash
# 1. Confirm correct branch
git branch --show-current  # must match the sprint being tested

# 2. Clean working tree
git status  # must be clean — no uncommitted changes

# 3. Migrations applied
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
# must report: No pending migrations to apply

# 4. Restart service
sudo systemctl restart wren.service
sleep 5

# 5. Health check
curl http://localhost:3001/health
# must return: { status: ok, services: { database: ok, redis: ok } }
```

Only when all 5 steps pass: brief Rex to run the test suite.

---

*Rules 13-16 added 2026-03-20 after Sprint 4 regression incident*
