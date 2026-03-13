# Sprint 0: Repo Scaffold + Infrastructure Foundation
**Branch:** `sprint/0-repo-scaffold`
**Goal:** A running skeleton that every subsequent sprint hangs off. Zero product features. Everything wired up, nothing broken.
**Definition of Done:** `pnpm install && docker-compose up` starts all services. A developer can hit `http://localhost:3000`, log in via Clerk, land on an empty dashboard, and see their tenant slug in the URL. All tests pass.

---

## Context for Agents

Before starting ANY task in this sprint, load these docs into your context:
- `docs/ADR.md` — all architectural decisions
- - `docs/MODULE_MAP.md` — module boundaries and responsibilities
  - - `docs/CONTRIBUTING.md` — the 10 non-negotiable rules
   
    - ---

    ## Task List

    ### Task 0.1: Monorepo Scaffold

    **Owner:** Claude Code
    **Output:** Working pnpm workspace with Turborepo

    Create the following file structure:

    ```
    panda/
    ├── package.json              (root — workspace definition)
    ├── pnpm-workspace.yaml
    ├── turbo.json
    ├── .env.example              (all required env vars documented)
    ├── docker-compose.yml        (postgres, redis, n8n, litellm, mailhog, minio)
    ├── apps/
    │   ├── web/
    │   │   ├── package.json      (name: @panda/web)
    │   │   ├── next.config.ts
    │   │   ├── tsconfig.json
    │   │   └── src/
    │   │       └── app/
    │   │           ├── layout.tsx
    │   │           ├── page.tsx  (redirects to /login or /dashboard)
    │   │           ├── (marketing)/
    │   │           │   └── page.tsx  (simple placeholder landing)
    │   │           ├── (auth)/
    │   │           │   ├── login/page.tsx
    │   │           │   └── register/page.tsx
    │   │           └── (dashboard)/
    │   │               └── [tenantSlug]/
    │   │                   └── page.tsx  (empty dashboard shell)
    │   ├── api/
    │   │   ├── package.json      (name: @panda/api)
    │   │   ├── tsconfig.json
    │   │   └── src/
    │   │       ├── index.ts      (Fastify server entry)
    │   │       ├── config.ts     (all env vars validated with Zod)
    │   │       ├── plugins/
    │   │       │   ├── auth.ts   (Clerk JWT verification middleware)
    │   │       │   ├── cors.ts
    │   │       │   └── rateLimit.ts
    │   │       └── routes/
    │   │           ├── health.ts (GET /health — returns 200, db+redis status)
    │   │           └── index.ts  (route registration)
    │   └── worker/
    │       ├── package.json      (name: @panda/worker)
    │       ├── tsconfig.json
    │       └── src/
    │           ├── index.ts      (BullMQ worker entry)
    │           └── queues/
    │               └── index.ts  (queue definitions — empty processors for now)
    └── packages/
        ├── db/
        │   ├── package.json      (name: @panda/db)
        │   ├── tsconfig.json
        │   └── prisma/
        │       ├── schema.prisma (full schema — see Task 0.2)
        │       └── seed.ts       (creates a test tenant + admin user)
        ├── types/
        │   ├── package.json      (name: @panda/types)
        │   ├── tsconfig.json
        │   └── src/
        │       └── index.ts      (exports all shared types)
        ├── ui/
        │   ├── package.json      (name: @panda/ui)
        │   ├── tsconfig.json
        │   └── src/
        │       └── index.ts      (re-exports shadcn components)
        ├── llm/
        │   ├── package.json      (name: @panda/llm)
        │   ├── tsconfig.json
        │   └── src/
        │       ├── index.ts
        │       ├── models.ts     (MODELS registry)
        │       └── client.ts     (LiteLLM wrapper — stub for Sprint 0)
        ├── agents/
        │   ├── package.json      (name: @panda/agents)
        │   ├── README.md
        │   └── src/
        │       └── index.ts      (stub — Sprint 2 implements this)
        ├── channels/
        │   ├── package.json      (name: @panda/channels)
        │   ├── README.md
        │   └── src/
        │       ├── types.ts      (ChannelAdapter interface — see spec below)
        │       └── index.ts      (exports)
        └── config/
            ├── package.json      (name: @panda/config)
            ├── prettier.config.js
            ├── eslint.config.js
            └── tsconfig.base.json
    ```

    **Root `package.json`:**
    ```json
    {
      "name": "panda",
      "private": true,
      "scripts": {
        "dev": "turbo run dev",
        "build": "turbo run build",
        "test": "turbo run test",
        "lint": "turbo run lint",
        "db:migrate": "pnpm --filter @panda/db exec prisma migrate dev",
        "db:seed": "pnpm --filter @panda/db exec prisma db seed",
        "db:studio": "pnpm --filter @panda/db exec prisma studio"
      },
      "devDependencies": {
        "turbo": "^2.0.0",
        "typescript": "^5.4.0",
        "prettier": "^3.2.0"
      }
    }
    ```

    **`pnpm-workspace.yaml`:**
    ```yaml
    packages:
      - 'apps/*'
      - 'packages/*'
    ```

    **`turbo.json`:**
    ```json
    {
      "$schema": "https://turbo.build/schema.json",
      "tasks": {
        "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
        "dev": { "persistent": true, "cache": false },
        "test": { "dependsOn": ["^build"] },
        "lint": {}
      }
    }
    ```

    ---

    ### Task 0.2: Database Schema (Prisma)

    **Owner:** Claude Code
    **Output:** `packages/db/prisma/schema.prisma` with full schema, first migration, and seed script

    ```prisma
    generator client {
      provider        = "prisma-client-js"
      previewFeatures = ["postgresqlExtensions"]
    }

    datasource db {
      provider   = "postgresql"
      url        = env("DATABASE_URL")
      extensions = [pgvector(map: "vector", schema: "public")]
    }

    // ─── ENUMS ───────────────────────────────────────────────────────────────────

    enum Plan {
      TRIAL
      BUSINESS
      ENTERPRISE
    }

    enum UserRole {
      SUPER_ADMIN
      TENANT_ADMIN
      DEPT_ADMIN
      USER
    }

    enum KBType {
      VECTOR
      GRAPH
    }

    enum DocStatus {
      PENDING
      PROCESSING
      INDEXED
      FAILED
    }

    enum MessageRole {
      USER
      ASSISTANT
      SYSTEM
      TOOL
    }

    // ─── TENANT ──────────────────────────────────────────────────────────────────

    model Tenant {
      id               String    @id @default(cuid())
      clerkOrgId       String    @unique
      slug             String    @unique
      name             String
      plan             Plan      @default(TRIAL)
      whiteLabelConfig Json?
      settings         Json?
      createdAt        DateTime  @default(now())
      updatedAt        DateTime  @updatedAt

      users            TenantUser[]
      agents           Agent[]
      knowledgeBases   KnowledgeBase[]
      prompts          Prompt[]
      chatSessions     ChatSession[]
      channelConfigs   ChannelConfig[]
      workflows        Workflow[]
      auditLogs        AuditLog[]
    }

    // ─── USER ────────────────────────────────────────────────────────────────────

    model TenantUser {
      id          String    @id @default(cuid())
      tenantId    String
      clerkUserId String
      role        UserRole  @default(USER)
      department  String?
      createdAt   DateTime  @default(now())
      updatedAt   DateTime  @updatedAt

      tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

      @@unique([tenantId, clerkUserId])
      @@index([tenantId])
    }

    // ─── AGENT ───────────────────────────────────────────────────────────────────

    model Agent {
      id            String    @id @default(cuid())
      tenantId      String
      name          String
      description   String?
      systemPrompt  String    @db.Text
      modelId       String    @default("gpt-4o")
      memorySize    Int       @default(20)
      maxTokens     Int       @default(4000)
      isDefault     Boolean   @default(false)
      isActive      Boolean   @default(true)
      tools         String[]
      kbInstanceIds String[]
      createdAt     DateTime  @default(now())
      updatedAt     DateTime  @updatedAt

      tenant        Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
      chatSessions  ChatSession[]

      @@index([tenantId])
    }

    // ─── KNOWLEDGE BASE ───────────────────────────────────────────────────────────

    model KnowledgeBase {
      id           String    @id @default(cuid())
      tenantId     String
      name         String
      description  String?
      type         KBType    @default(VECTOR)
      instructions String?   @db.Text
      resultLimit  Int       @default(5)
      createdAt    DateTime  @default(now())
      updatedAt    DateTime  @updatedAt

      tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
      documents    KBDocument[]

      @@index([tenantId])
    }

    model KBDocument {
      id              String      @id @default(cuid())
      knowledgeBaseId String
      tenantId        String
      filename        String
      fileUrl         String
      mimeType        String
      status          DocStatus   @default(PENDING)
      chunkCount      Int?
      errorMessage    String?
      createdAt       DateTime    @default(now())
      updatedAt       DateTime    @updatedAt

      knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
      chunks          KBChunk[]

      @@index([tenantId])
      @@index([knowledgeBaseId])
    }

    model KBChunk {
      id          String                      @id @default(cuid())
      documentId  String
      tenantId    String
      content     String                      @db.Text
      embedding   Unsupported("vector(1536)")?
      metadata    Json?
      chunkIndex  Int
      createdAt   DateTime                    @default(now())

      document    KBDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

      @@index([tenantId])
      @@index([documentId])
    }

    // ─── PROMPTS ─────────────────────────────────────────────────────────────────

    model Prompt {
      id                   String    @id @default(cuid())
      tenantId             String?
      title                String
      description          String?
      category             String
      department           String
      difficulty           String    @default("beginner")
      formSchema           Json
      promptTemplate       String    @db.Text
      isPublic             Boolean   @default(false)
      estimatedMinutesSaved Int?
      usageCount           Int       @default(0)
      createdAt            DateTime  @default(now())
      updatedAt            DateTime  @updatedAt

      tenant               Tenant?   @relation(fields: [tenantId], references: [id], onDelete: SetNull)

      @@index([tenantId])
      @@index([department])
    }

    // ─── CHAT ────────────────────────────────────────────────────────────────────

    model ChatSession {
      id          String    @id @default(cuid())
      tenantId    String
      userId      String
      agentId     String
      channelType String
      channelId   String
      title       String?
      isActive    Boolean   @default(true)
      createdAt   DateTime  @default(now())
      updatedAt   DateTime  @updatedAt

      tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
      agent       Agent     @relation(fields: [agentId], references: [id])
      messages    ChatMessage[]

      @@index([tenantId])
      @@index([userId])
    }

    model ChatMessage {
      id          String      @id @default(cuid())
      sessionId   String
      tenantId    String
      role        MessageRole
      content     String      @db.Text
      toolCalls   Json?
      tokenCount  Int?
      modelId     String?
      costUsd     Float?
      createdAt   DateTime    @default(now())

      session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

      @@index([tenantId])
      @@index([sessionId])
    }

    // ─── CHANNELS ────────────────────────────────────────────────────────────────

    model ChannelConfig {
      id        String    @id @default(cuid())
      tenantId  String
      channel   String
      config    Json
      isActive  Boolean   @default(true)
      agentId   String?
      createdAt DateTime  @default(now())
      updatedAt DateTime  @updatedAt

      tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

      @@unique([tenantId, channel])
      @@index([tenantId])
    }

    // ─── WORKFLOWS ───────────────────────────────────────────────────────────────

    model Workflow {
      id          String    @id @default(cuid())
      tenantId    String
      n8nId       String
      name        String
      description String?
      category    String?
      isActive    Boolean   @default(false)
      runCount    Int       @default(0)
      lastRunAt   DateTime?
      createdAt   DateTime  @default(now())
      updatedAt   DateTime  @updatedAt

      tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

      @@index([tenantId])
    }

    // ─── AUDIT LOG ────────────────────────────────────────────────────────────────

    model AuditLog {
      id         String    @id @default(cuid())
      tenantId   String
      userId     String?
      action     String
      resource   String
      resourceId String?
      metadata   Json?
      ipAddress  String?
      createdAt  DateTime  @default(now())

      tenant     Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

      @@index([tenantId])
      @@index([createdAt])
    }
    ```

    **Seed script** (`packages/db/prisma/seed.ts`):
    - Creates one Tenant (`slug: "demo"`, `name: "Demo Company"`, `plan: TRIAL`)
    - - Creates one TenantUser (role: TENANT_ADMIN) — clerkUserId from env var `SEED_CLERK_USER_ID`
      - - Creates one default Agent (`name: "Assistant"`, generic system prompt)
        - - Creates one KnowledgeBase (`name: "Company Knowledge"`, type: VECTOR)
          - - Logs all created IDs
           
            - ---

            ### Task 0.3: Docker Compose

            **Owner:** Claude Code
            **Output:** `docker-compose.yml` at repo root

            ```yaml
            version: '3.9'

            services:
              postgres:
                image: pgvector/pgvector:pg16
                environment:
                  POSTGRES_DB: panda
                  POSTGRES_USER: panda
                  POSTGRES_PASSWORD: panda_dev
                ports:
                  - "5432:5432"
                volumes:
                  - postgres_data:/var/lib/postgresql/data
                healthcheck:
                  test: ["CMD-SHELL", "pg_isready -U panda"]
                  interval: 5s
                  timeout: 5s
                  retries: 5

              redis:
                image: redis:7-alpine
                ports:
                  - "6379:6379"
                volumes:
                  - redis_data:/data
                healthcheck:
                  test: ["CMD", "redis-cli", "ping"]
                  interval: 5s
                  timeout: 5s
                  retries: 5

              n8n:
                image: n8nio/n8n:latest
                environment:
                  N8N_BASIC_AUTH_ACTIVE: "true"
                  N8N_BASIC_AUTH_USER: admin
                  N8N_BASIC_AUTH_PASSWORD: admin_dev
                  WEBHOOK_URL: http://localhost:5678
                  DB_TYPE: postgresdb
                  DB_POSTGRESDB_HOST: postgres
                  DB_POSTGRESDB_PORT: 5432
                  DB_POSTGRESDB_DATABASE: n8n
                  DB_POSTGRESDB_USER: panda
                  DB_POSTGRESDB_PASSWORD: panda_dev
                ports:
                  - "5678:5678"
                depends_on:
                  postgres:
                    condition: service_healthy
                volumes:
                  - n8n_data:/home/node/.n8n

              litellm:
                image: ghcr.io/berriai/litellm:main-latest
                ports:
                  - "4000:4000"
                volumes:
                  - ./litellm.config.yaml:/app/config.yaml
                command: ["--config", "/app/config.yaml", "--port", "4000"]
                environment:
                  LITELLM_MASTER_KEY: sk-dev-master-key

              mailhog:
                image: mailhog/mailhog:latest
                ports:
                  - "1025:1025"
                  - "8025:8025"

              minio:
                image: minio/minio:latest
                environment:
                  MINIO_ROOT_USER: minio_dev
                  MINIO_ROOT_PASSWORD: minio_dev_secret
                ports:
                  - "9000:9000"
                  - "9001:9001"
                volumes:
                  - minio_data:/data
                command: server /data --console-address ":9001"

            volumes:
              postgres_data:
              redis_data:
              n8n_data:
              minio_data:
            ```

            Also create `litellm.config.yaml`:
            ```yaml
            model_list:
              - model_name: gpt-4o
                litellm_params:
                  model: openai/gpt-4o
                  api_key: os.environ/OPENAI_API_KEY
              - model_name: gpt-4o-mini
                litellm_params:
                  model: openai/gpt-4o-mini
                  api_key: os.environ/OPENAI_API_KEY
              - model_name: claude-sonnet-4
                litellm_params:
                  model: anthropic/claude-sonnet-4-5
                  api_key: os.environ/ANTHROPIC_API_KEY
              - model_name: text-embedding-3-small
                litellm_params:
                  model: openai/text-embedding-3-small
                  api_key: os.environ/OPENAI_API_KEY

            general_settings:
              master_key: os.environ/LITELLM_MASTER_KEY
            ```

            ---

            ### Task 0.4: Auth Integration (Clerk)

            **Owner:** Claude Code
            **Output:** Working auth flow in `/apps/web` and JWT verification in `/apps/api`

            **Web app:**
            - Install `@clerk/nextjs`
            - - Wrap root layout with `<ClerkProvider>`
              - - Middleware: protect all `(dashboard)` routes, redirect to `/login` if unauthenticated
                - - `/login` page: `<SignIn />` component
                  - - `/register` page: `<SignUp />` component
                    - - After sign-in: redirect to `/(dashboard)/[tenantSlug]` where `tenantSlug` comes from Clerk org slug
                      - - If user has no org: show "Create your workspace" prompt
                       
                        - **API:**
                        - - Install `@clerk/fastify`
                          - - `plugins/auth.ts`: Clerk JWT verification as a Fastify preHandler
                            - - Extracts `clerkUserId`, `tenantId` (from Clerk org), `userRole` from token
                              - - Attaches to `request.auth` (typed)
                                - - Add Zod-validated env vars: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
                                 
                                  - **Types** (in `/packages/types/src/auth.ts`):
                                  - ```typescript
                                    export interface AuthContext {
                                      clerkUserId: string
                                      tenantId: string
                                      clerkOrgId: string
                                      role: UserRole
                                    }

                                    // Fastify type augmentation
                                    declare module 'fastify' {
                                      interface FastifyRequest {
                                        auth: AuthContext
                                      }
                                    }
                                    ```

                                    ---

                                    ### Task 0.5: Health Check + Smoke Test Routes

                                    **Owner:** Claude Code
                                    **Output:** `/health` endpoint, basic API structure

                                    `GET /health` returns:
                                    ```json
                                    {
                                      "status": "ok",
                                      "timestamp": "2026-03-13T20:00:00Z",
                                      "services": {
                                        "database": "ok",
                                        "redis": "ok"
                                      },
                                      "version": "0.1.0"
                                    }
                                    ```

                                    If any service is down, return 503 with `"status": "degraded"`.

                                    ---

                                    ### Task 0.6: Empty Dashboard Shell

                                    **Owner:** Claude Code
                                    **Output:** Logged-in user lands on a working (empty) dashboard

                                    - URL: `/(dashboard)/[tenantSlug]`
                                    - - Shows: tenant name, user avatar (from Clerk), nav sidebar (empty links), main content area ("Welcome to Panda" placeholder)
                                      - - Uses shadcn/ui: `Sidebar`, `Avatar`, `Button`, basic layout
                                        - - Responsive (mobile + desktop)
                                          - - White-label ready: reads `tenant.whiteLabelConfig` (if set) and applies `primaryColor` via CSS variable. Falls back to Panda defaults.
                                            - - Dark/light mode toggle (shadcn theme)
                                             
                                              - ---

                                              ### Task 0.7: `.env.example`

                                              **Owner:** Claude Code
                                              **Output:** Documented `.env.example` at repo root

                                              ```bash
                                              # ─── DATABASE ────────────────────────────────────────────────────────────────
                                              DATABASE_URL=postgresql://panda:panda_dev@localhost:5432/panda

                                              # ─── REDIS ───────────────────────────────────────────────────────────────────
                                              REDIS_URL=redis://localhost:6379

                                              # ─── CLERK AUTH ──────────────────────────────────────────────────────────────
                                              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
                                              CLERK_SECRET_KEY=sk_test_...
                                              NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
                                              NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
                                              NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
                                              NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

                                              # ─── LLM (LiteLLM proxy) ─────────────────────────────────────────────────────
                                              LITELLM_BASE_URL=http://localhost:4000
                                              LITELLM_API_KEY=sk-dev-master-key

                                              # ─── LLM PROVIDERS (passed to LiteLLM container) ─────────────────────────────
                                              OPENAI_API_KEY=sk-...
                                              ANTHROPIC_API_KEY=sk-ant-...

                                              # ─── FILE STORAGE ─────────────────────────────────────────────────────────────
                                              # Dev: MinIO (local)
                                              S3_ENDPOINT=http://localhost:9000
                                              S3_BUCKET=panda-dev
                                              S3_ACCESS_KEY=minio_dev
                                              S3_SECRET_KEY=minio_dev_secret
                                              # Prod: swap to Cloudflare R2 credentials

                                              # ─── n8n ─────────────────────────────────────────────────────────────────────
                                              N8N_BASE_URL=http://localhost:5678
                                              N8N_API_KEY=                        # generate after starting n8n

                                              # ─── EMAIL (Dev: Mailhog) ─────────────────────────────────────────────────────
                                              SMTP_HOST=localhost
                                              SMTP_PORT=1025
                                              SMTP_FROM=noreply@panda.dev

                                              # ─── APP ─────────────────────────────────────────────────────────────────────
                                              API_PORT=3001
                                              API_BASE_URL=http://localhost:3001
                                              NEXT_PUBLIC_API_URL=http://localhost:3001
                                              NODE_ENV=development

                                              # ─── SEED ────────────────────────────────────────────────────────────────────
                                              SEED_CLERK_USER_ID=user_...         # your Clerk user ID for seeding
                                              ```

                                              ---

                                              ### Task 0.8: ChannelAdapter Interface

                                              **Owner:** Claude Code
                                              **Output:** `/packages/channels/src/types.ts` — the interface all adapters must implement

                                              ```typescript
                                              // /packages/channels/src/types.ts

                                              export interface InboundMessage {
                                                channelType: ChannelType
                                                channelMessageId: string      // channel-native message ID
                                                channelUserId: string         // channel-native user ID
                                                channelSessionId: string      // channel-native thread/session ID
                                                text: string
                                                attachments?: InboundAttachment[]
                                                metadata?: Record<string, unknown>
                                                receivedAt: Date
                                              }

                                              export interface InboundAttachment {
                                                type: 'image' | 'file' | 'audio' | 'video'
                                                url: string
                                                mimeType?: string
                                                filename?: string
                                                sizeBytes?: number
                                              }

                                              export interface ChannelRecipient {
                                                channelUserId: string
                                                channelSessionId: string
                                              }

                                              export interface OutboundMessage {
                                                text?: string
                                                markdown?: string
                                                attachments?: OutboundAttachment[]
                                                actions?: ActionButton[]
                                              }

                                              export interface OutboundAttachment {
                                                type: 'file' | 'image'
                                                url: string
                                                filename?: string
                                              }

                                              export interface ActionButton {
                                                id: string
                                                label: string
                                                value: string
                                              }

                                              export type MessageHandler = (
                                                message: InboundMessage,
                                                tenantId: string,
                                                userId: string
                                              ) => Promise<void>

                                              export type ChannelType =
                                                | 'teams'
                                                | 'slack'
                                                | 'whatsapp'
                                                | 'telegram'
                                                | 'email'
                                                | 'webchat'

                                              export interface ChannelAdapter {
                                                readonly id: ChannelType
                                                readonly name: string

                                                /** Register handler for inbound messages */
                                                onMessage(handler: MessageHandler): void

                                                /** Send a message to a user */
                                                sendMessage(
                                                  recipient: ChannelRecipient,
                                                  message: OutboundMessage
                                                ): Promise<void>

                                                /** Optional: send typing indicator */
                                                sendTyping?(recipient: ChannelRecipient): Promise<void>

                                                /** Health check — returns true if channel is reachable */
                                                ping(): Promise<boolean>
                                              }
                                              ```

                                              ---

                                              ## Acceptance Criteria

                                              Before declaring Sprint 0 complete, verify ALL of the following:

                                              - [ ] `pnpm install` completes without errors from repo root
                                              - [ ] - [ ] `docker-compose up` starts all 6 services (postgres, redis, n8n, litellm, mailhog, minio)
                                              - [ ] - [ ] `pnpm db:migrate` runs successfully against the Docker postgres
                                              - [ ] - [ ] `pnpm db:seed` creates demo tenant + user + agent + KB
                                              - [ ] - [ ] `GET http://localhost:3001/health` returns `{"status": "ok", ...}` with both services healthy
                                              - [ ] - [ ] `http://localhost:3000` loads, redirects unauthenticated users to `/login`
                                              - [ ] - [ ] After Clerk sign-in, user is redirected to `/(dashboard)/demo` (or their org slug)
                                              - [ ] - [ ] Dashboard shows tenant name and user avatar
                                              - [ ] - [ ] No TypeScript errors (`pnpm build` passes)
                                              - [ ] - [ ] No ESLint errors (`pnpm lint` passes)
                                              - [ ] - [ ] All 10 CONTRIBUTING.md rules visibly respected in the code
                                             
                                              - [ ] ---
                                             
                                              - [ ] ## What Sprint 0 Does NOT Build
                                             
                                              - [ ] To be explicit — these are out of scope and should not be touched:
                                             
                                              - [ ] - Prompt library UI or data
                                              - [ ] - Knowledge base upload functionality
                                              - [ ] - Any agent logic
                                              - [ ] - Any channel adapter implementations (interface only)
                                              - [ ] - Workflow builder or n8n integration
                                              - [ ] - Billing or Stripe
                                              - [ ] - Analytics
                                              - [ ] - Email sending (Mailhog configured but no sending code)
                                             
                                              - [ ] ---
                                             
                                              - [ ] ## Notes for Claude Code
                                             
                                              - [ ] 1. The Prisma schema includes `Unsupported("vector(1536)")` for embeddings. This requires the pgvector Docker image (`pgvector/pgvector:pg16`), not plain `postgres:16`. The docker-compose.yml uses the correct image.
                                             
                                              - [ ] 2. The `n8n` service in Docker Compose needs its own database. Create a separate `n8n` database in postgres, or configure n8n to use SQLite for dev (`DB_TYPE: sqlite`). SQLite is fine for Sprint 0.
                                             
                                              - [ ] 3. For Clerk: create a free Clerk application at clerk.com, create an Organisation, copy the publishable + secret keys into `.env`. The `tenantSlug` in the URL comes from `organization.slug` in the Clerk session.
                                             
                                              - [ ] 4. LiteLLM in Sprint 0 is a live service but the `/packages/llm` client is a stub (no actual calls made in Sprint 0). The Docker service should start and respond to `GET /health`.
                                             
                                              - [ ] 5. Use `pnpm` not `npm` or `yarn`. The monorepo is set up for pnpm workspaces.
                                             
                                              - [ ] ---
                                             
                                              - [ ] *Sprint 0 authored: 13/03/2026*
                                              - [ ] *Next sprint: `docs/sprints/SPRINT_1.md` — Prompt Library (data model + UI + execution)*
