# 🐦 Wren

> **Global SMB AI Platform** — prompt library, knowledge bases, AI agents, workflow automation, and multi-channel chat. Built for businesses worldwide.
>
> Private repository — CuveeBits s.r.o.
>
> ---
>
> ## What is Wren?
>
> Wren is a full-spectrum AI platform for small and medium businesses globally. It combines:
>
> - **Prompt Library** — 200+ business templates with adaptive form UIs (no prompt engineering required)
> - - **Knowledge Bases** — Upload company documents, create a RAG-powered knowledge base per department
> - - **AI Agents** — Configurable agents per department, connected to your KBs and tools
> - - **Workflow Automation** — Visual drag-and-drop builder powered by n8n (400+ integrations)
> - - **Multi-channel Chat** — Teams, Slack, WhatsApp, Telegram, Email, WebChat
> - - **White-label** — Full rebrand for reseller/SI channel partners
>          
> - ---
>
> ## Quick Start (Development)
>
> ```bash
> # 1. Clone and install
> git clone https://github.com/CuveeBits/wren.git
> cd wren
> pnpm install
>
> # 2. Copy env vars
> cp .env.example .env
> # Edit .env — add your Clerk, OpenAI, Anthropic keys
>
> # 3. Start infrastructure
> docker-compose up -d
>
> # 4. Run migrations and seed
> pnpm db:migrate
> pnpm db:seed
>
> # 5. Start all apps
> pnpm dev
> ```
>
> - Web dashboard: http://localhost:3000
> - - API: http://localhost:3001
> - - n8n: http://localhost:5678
> - - LiteLLM: http://localhost:4000
> - - Mailhog: http://localhost:8025
> - - MinIO: http://localhost:9001
>          
> - ---
>
> ## Documentation
>
> | Document | Description |
> |---|---|
> | [docs/ADR.md](./docs/ADR.md) | Architecture Decision Records — all major technical decisions and why |
> | [docs/MODULE_MAP.md](./docs/MODULE_MAP.md) | System module map, boundaries, data flows |
> | [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Coding rules — read before writing any code |
> | [docs/NAMING.md](./docs/NAMING.md) | Why Wren — the name, the story, the domains |
> | [docs/sprints/SPRINT_0.md](./docs/sprints/SPRINT_0.md) | Sprint 0: Repo scaffold + infrastructure |
>
> ---
>
> ## Tech Stack
>
> | Layer | Technology |
> |---|---|
> | Frontend | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui |
> | Backend | Fastify, Node.js, TypeScript |
> | Database | PostgreSQL 16 + pgvector, Prisma ORM |
> | Cache / Jobs | Redis 7, BullMQ |
> | LLM Gateway | LiteLLM (unified proxy for OpenAI, Anthropic, Mistral, Ollama) |
> | Workflow Engine | n8n (self-hosted, per-tenant workspaces) |
> | Auth | Clerk (multi-tenant, SAML/SSO) |
> | File Storage | Cloudflare R2 (dev: MinIO) |
> | Monorepo | pnpm workspaces + Turborepo |
>
> ---
>
> ## Monorepo Structure
>
> ```
> wren/
> ├── apps/
> │   ├── web/      → Next.js dashboard
> │   ├── api/      → Fastify API server
> │   └── worker/   → BullMQ background worker
> └── packages/
>     ├── db/       → Prisma schema + migrations
>     ├── types/    → Shared TypeScript types
>     ├── ui/       → Shared component library
>     ├── llm/      → LiteLLM gateway wrapper
>     ├── agents/   → Agent runtime
>     ├── channels/ → Channel adapters (Teams, Slack, WhatsApp, etc.)
>     └── config/   → Shared ESLint, Prettier, TypeScript configs
> ```
>
> ---
>
> ## Sprint Roadmap
>
> | Sprint | Focus | Status |
> |--------|-------|--------|
> | Sprint 0 | Repo scaffold + infrastructure + auth + DB schema | ✅ Complete |
> | Sprint 1 | Prompt library — data model, UI, execution | ✅ Complete |
> | Sprint 2 | Knowledge base — upload, indexing, RAG query | ✅ Complete |
> | Sprint 3 | Chat interface + first channel adapter (WebChat) | ✅ Complete |
> | Sprint 4 | Auto-translate, UI localisation, and prompt translation — DE/FR/CZ/PL/EN via local Ollama (GDPR-native) | ✅ Complete |
> | Sprint 5 | Agent builder UI + tool dispatch + n8n scaffolding | 🔲 Planned |
> | Sprint 6 | n8n workflow integration (full) | 🔲 Planned |
> | Sprint 7 | Multi-model selection per tenant + Analytics dashboard | 🔲 Planned |
> | Sprint 8 | Slack + WhatsApp adapters + white-label config | 🔲 Planned |
> | Sprint 9 | Social media content pipeline | 🔲 Planned |
> | Sprint 10 | Billing + usage tracking | 🔲 Planned |
>
> **Nova CRM** is a separate product epic — own backlog, own sprints. Not part of Wren core.
>
> ---
>
> ## Domains
>
> - **`usewren.ai`** — product, platform, where customers go
> - - **`wrenhq.com`** — company, corporate entity, investors and partners
>  
> - ---
>
> *Built by CuveeBits s.r.o. — architecture by Claude (Anthropic)*
