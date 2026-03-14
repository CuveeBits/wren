# Sprint 1: Prompt Library
**Branch:** `sprint/1-prompt-library`
**Goal:** Users can browse a curated library of AI prompt templates, fill in a guided form, and get a high-quality AI response — all in under 60 seconds.
**Definition of Done:** A logged-in user can browse prompts by department, open one, fill in the adaptive form, submit, and see a streaming AI response. The seed contains ≥50 production-ready templates across ≥8 departments.

---

## Context for Agents

Before starting ANY task in this sprint, load these docs into your context:
- `docs/ADR.md` — all architectural decisions
- `docs/MODULE_MAP.md` — module boundaries and responsibilities
- `docs/CONTRIBUTING.md` — the 10 non-negotiable rules

**Package namespace:** `@wren/` (NOT `@panda/` — project was renamed)

---

## Task List

### Task 1.1: API Routes — Prompt Library

**Owner:** Forge (Claude Code)
**Output:** `/apps/api/src/routes/prompts.ts` — full CRUD + execute endpoint

```
GET  /api/v1/prompts              → list with filters
GET  /api/v1/prompts/:id          → single prompt + formSchema
POST /api/v1/prompts/:id/execute  → render template + stream LLM response
GET  /api/v1/prompts/meta/depts   → distinct departments list
GET  /api/v1/prompts/meta/cats    → distinct categories list
```

**GET /api/v1/prompts query params:**
```typescript
{
  department?: string     // filter by department slug
  category?:   string     // filter by category slug
  search?:     string     // full-text search on title + description
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  page?:       number     // default: 1
  limit?:      number     // default: 24, max: 100
}
```

**Response shape (list):**
```typescript
{
  data: PromptSummary[]
  meta: { total: number; page: number; limit: number; pages: number }
}

interface PromptSummary {
  id: string
  title: string
  description: string
  category: string
  department: string
  difficulty: string
  estimatedMinutesSaved: number | null
  usageCount: number
}
```

**POST /api/v1/prompts/:id/execute:**
- Body: `{ variables: Record<string, string> }` — form field values
- Renders the `promptTemplate` (Handlebars) with `variables`
- Calls LiteLLM via `@wren/llm` client
- Returns **SSE stream** (Content-Type: text/event-stream)
- Event format: `data: {"type":"chunk","content":"..."}\n\n` during stream
- Final event: `data: {"type":"done","tokenCount":N}\n\n`
- On error: `data: {"type":"error","message":"..."}\n\n`
- Increments `Prompt.usageCount` after successful completion (fire-and-forget)
- PROTECTED: requires Clerk auth (use `fastify.auth` preHandler)

**Validation:** Zod schemas for all inputs. Return 422 with field-level errors on invalid input.

---

### Task 1.2: Execution Engine

**Owner:** Forge (Claude Code)
**Output:** `/packages/llm/src/execute.ts` — prompt execution logic

```typescript
// packages/llm/src/execute.ts

import Handlebars from 'handlebars'
import { getLiteLLMClient } from './client'

export interface ExecuteOptions {
  promptTemplate: string
  variables: Record<string, string>
  modelId?: string        // default: 'claude-sonnet-4'
  maxTokens?: number      // default: 2000
  stream: true
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error'
  content?: string
  tokenCount?: number
  message?: string
}

/**
 * Renders a Handlebars template and streams the LLM response.
 * Returns an AsyncGenerator yielding StreamChunk objects.
 */
export async function* executePrompt(
  options: ExecuteOptions
): AsyncGenerator<StreamChunk> {
  // 1. Render Handlebars template
  // 2. Call LiteLLM with stream: true
  // 3. Yield chunk events
  // 4. Yield done event with token count
}
```

**Handlebars helpers to register:**
- `{{uppercase value}}` — UPPER CASE
- `{{lowercase value}}` — lower case
- `{{trim value}}` — trim whitespace
- `{{#if value}}...{{/if}}` — conditional (built-in)

**Error handling:**
- Template compile error → throw with helpful message
- LiteLLM timeout (>30s) → yield error event, do not throw
- LiteLLM 4xx/5xx → yield error event with message

---

### Task 1.3: Adaptive Form Renderer

**Owner:** Forge (Claude Code)
**Output:** `/apps/web/src/components/prompt/PromptForm.tsx`

The `formSchema` stored in the DB is a **JSON Schema** object describing the form fields.
The renderer turns it into a live form using `react-hook-form` + `zod` for validation.

**Supported field types** (JSON Schema `type` + optional `x-field-type`):
| JSON Schema type | x-field-type | Renders as |
|-----------------|--------------|------------|
| `string`        | (none)       | `<Input>`  |
| `string`        | `textarea`   | `<Textarea>` |
| `string`        | `select`     | `<Select>` with `enum` values |
| `string`        | `date`       | `<Input type="date">` |
| `number`        | (none)       | `<Input type="number">` |
| `boolean`       | (none)       | `<Checkbox>` |

**Field metadata** (in JSON Schema `properties[field]`):
```json
{
  "type": "string",
  "title": "Human-readable label",
  "description": "Helper text shown below the field",
  "x-field-type": "textarea",
  "x-placeholder": "Placeholder text",
  "minLength": 10,
  "maxLength": 500,
  "enum": ["Option A", "Option B"],
  "x-enum-labels": ["Label for A", "Label for B"]
}
```

**Required fields:** Derived from JSON Schema `required` array.

**Component API:**
```typescript
interface PromptFormProps {
  schema: JSONSchema           // the formSchema from DB
  onSubmit: (values: Record<string, string>) => void
  isLoading?: boolean          // shows spinner on submit button
}
```

Uses shadcn/ui components: `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, `Button`.

---

### Task 1.4: Prompt Library Browse Page

**Owner:** Forge (Claude Code)
**Output:** `/apps/web/src/app/(dashboard)/[tenantSlug]/prompts/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Prompt Library                          [Search...] │
├──────────────┬──────────────────────────────────────┤
│              │  ┌──────┐ ┌──────┐ ┌──────┐         │
│ Departments  │  │Card  │ │Card  │ │Card  │         │
│ ──────────── │  └──────┘ └──────┘ └──────┘         │
│ • All        │  ┌──────┐ ┌──────┐ ┌──────┐         │
│ • HR         │  │Card  │ │Card  │ │Card  │         │
│ • Sales      │  └──────┘ └──────┘ └──────┘         │
│ • Finance    │                                      │
│ • Legal      │           [Load more]               │
│ • ...        │                                      │
└──────────────┴──────────────────────────────────────┘
```

**PromptCard component** (`/apps/web/src/components/prompt/PromptCard.tsx`):
- Title, description (truncated 2 lines)
- Department badge, difficulty badge
- "⏱ Saves X min" if estimatedMinutesSaved set
- Hover: slight lift shadow
- Click: navigate to `/[tenantSlug]/prompts/[id]`

**Behaviour:**
- Department filter is a sidebar list (desktop) / horizontal scroll chips (mobile)
- Search debounced 300ms, updates URL param `?search=`
- Pagination via "Load more" button (appends to existing results)
- Active department highlighted in sidebar
- Loading state: skeleton cards (3×2 grid)

---

### Task 1.5: Prompt Detail + Execute Page

**Owner:** Forge (Claude Code)
**Output:** `/apps/web/src/app/(dashboard)/[tenantSlug]/prompts/[id]/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ← Back to Library                                   │
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│  Title                   │  [Result appears here    │
│  Description             │   after submit —         │
│  Department | Difficulty │   streaming in real-time]│
│                          │                          │
│  ─── Fill in the form ── │                          │
│                          │                          │
│  [Adaptive form fields]  │                          │
│                          │                          │
│  [Generate with AI →]    │                          │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

**Behaviour:**
- On submit: POST to `/api/v1/prompts/:id/execute` with form values
- Reads SSE stream and renders markdown in the result panel using `react-markdown`
- While streaming: shows animated cursor at end of text, button shows spinner
- After done: shows token count footer + "Copy to clipboard" + "Try again" buttons
- On error: shows error message with retry option
- Mobile: form and result stacked vertically

---

### Task 1.6: Navigation — Add Prompts to Dashboard Sidebar

**Owner:** Forge (Claude Code)

Add "Prompt Library" with a `Sparkles` icon (lucide-react) to the dashboard sidebar nav.
Route: `/(dashboard)/[tenantSlug]/prompts`

Also add a quick-access card to the dashboard home page linking to the Prompt Library.

---

### Task 1.7: Prompt Template Seed Data

**Owner:** Spark (Codex/GPT-5.4)
**Output:** `/packages/db/prisma/seed-prompts.ts` — imported by `seed.ts`

Generate **≥50 production-quality prompt templates** across these departments:

| Department | Min templates | Example categories |
|-----------|--------------|-------------------|
| HR & People | 8 | Recruitment, Performance, Onboarding, Policy |
| Sales & Business Dev | 8 | Outreach, Proposals, Follow-up, Objection handling |
| Finance | 6 | Reports, Variance analysis, Budget justification |
| Legal & Compliance | 6 | Contract review, Policy drafting, Risk assessment |
| Operations | 6 | Process docs, SLA reports, Incident summaries |
| Marketing & Comms | 6 | Press releases, Social posts, Campaign briefs |
| IT & Technical | 6 | Incident reports, Change requests, Runbooks |
| Executive | 4 | Board updates, Strategy memos, OKR reviews |

**Each template must have:**
```typescript
{
  title: string                    // e.g. "Write a Job Description"
  description: string              // 1-2 sentences, value-focused
  category: string                 // e.g. "recruitment"
  department: string               // e.g. "hr"
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutesSaved: number    // realistic estimate
  isPublic: true                   // all seed templates are public
  formSchema: {                    // valid JSON Schema
    type: 'object',
    required: string[],
    properties: {
      [fieldName]: {
        type: string,
        title: string,
        description?: string,
        'x-field-type'?: string,
        'x-placeholder'?: string,
        minLength?: number,
        maxLength?: number,
        enum?: string[],
        'x-enum-labels'?: string[]
      }
    }
  },
  promptTemplate: string           // Handlebars template, 100-400 words
                                   // Uses {{fieldName}} variables
                                   // Clear instructions for the LLM
                                   // Professional, actionable output
}
```

**Quality bar:**
- Prompt templates must produce genuinely useful output, not generic fluff
- formSchema fields must match the variables used in the template exactly
- Each template should have 3-7 form fields (not too few, not too many)
- estimatedMinutesSaved should be realistic (range: 15-120)

**Export format:**
```typescript
// packages/db/prisma/seed-prompts.ts
export const seedPrompts: Omit<Prompt, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  // ... all templates
]
```

Update `seed.ts` to import and upsert all templates:
```typescript
import { seedPrompts } from './seed-prompts'
// upsert by title (idempotent)
for (const prompt of seedPrompts) {
  await db.prompt.upsert({
    where: { title_tenantId: { title: prompt.title, tenantId: null } },
    // if unique constraint doesn't exist, use findFirst + create
    update: prompt,
    create: { ...prompt, tenantId: null }
  })
}
```

---

## Acceptance Criteria

Before declaring Sprint 1 complete, verify ALL of the following:

- [ ] `GET /api/v1/prompts` returns paginated results with correct filters
- [ ] `GET /api/v1/prompts/:id` returns full prompt including formSchema
- [ ] `POST /api/v1/prompts/:id/execute` returns a streaming SSE response
- [ ] Handlebars variables render correctly (test with `{{name}}` in template)
- [ ] Prompt Library page loads and displays prompt cards
- [ ] Department filter works — clicking a dept filters the grid
- [ ] Search filters by title/description (debounced)
- [ ] PromptForm renders all field types correctly
- [ ] PromptForm validates required fields before submit
- [ ] Streaming result appears in real-time on the detail page
- [ ] "Copy to clipboard" works on the result
- [ ] Dashboard sidebar shows "Prompt Library" link
- [ ] ≥50 prompt templates in the DB after `pnpm db:seed`
- [ ] Templates cover ≥8 departments
- [ ] No TypeScript errors (`pnpm build` passes)
- [ ] No ESLint errors (`pnpm lint` passes)
- [ ] Mobile layout works on 375px viewport

---

## What Sprint 1 Does NOT Build

- Knowledge base upload or RAG
- Agent builder UI
- Channel adapter implementations
- Workflow builder
- User-created custom prompts (admin only for now)
- Prompt versioning
- Analytics/usage dashboard

---

## Notes for Agents

1. **LiteLLM is already running** on Docker at `http://localhost:4000` (lab machine). The `@wren/llm` client stub from Sprint 0 needs to be fleshed out to make real calls. Use the `LITELLM_BASE_URL` and `LITELLM_API_KEY` env vars.

2. **SSE in Fastify:** Use `reply.raw` to write directly to the response. Set headers before writing:
   ```typescript
   reply.raw.writeHead(200, {
     'Content-Type': 'text/event-stream',
     'Cache-Control': 'no-cache',
     'Connection': 'keep-alive',
   })
   ```

3. **Handlebars** is already a common dependency. Install with `pnpm add handlebars` in `packages/llm`.

4. **react-markdown** for rendering the streamed result. Install with `pnpm add react-markdown` in `apps/web`.

5. **The Prompt model is already in the Prisma schema** from Sprint 0. Do NOT modify the schema — work with what's there.

6. **Branch discipline:** Work on `sprint/1-prompt-library`. Commit logically per task. Do NOT merge to main.

7. **@wren/ namespace everywhere.** Any import using `@panda/` is a bug.

---

*Sprint 1 authored: 14/03/2026*
*Next sprint: `docs/sprints/SPRINT_2.md` — Knowledge Base (upload, chunk, embed, search)*
