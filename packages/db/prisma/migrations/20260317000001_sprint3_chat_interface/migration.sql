-- Sprint 3: Chat Interface + WebChat Adapter
-- Adds: Conversation, Message, ConversationDocument, TenantChatSettings
-- RLS note: all tables include tenantId; queries MUST scope by tenantId

-- ─── Conversation ──────────────────────────────────────────────────────────────

CREATE TABLE "Conversation" (
  "id"                   TEXT        NOT NULL PRIMARY KEY,
  "tenantId"             TEXT        NOT NULL,
  "userId"               TEXT        NOT NULL,
  "channel"              TEXT        NOT NULL DEFAULT 'app',
  "title"                TEXT,
  "status"               TEXT        NOT NULL DEFAULT 'active',
  "systemPromptSnapshot" TEXT,
  "lastMessageAt"        TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Conversation_tenantId_userId_lastMessageAt_idx"
  ON "Conversation" ("tenantId", "userId", "lastMessageAt");

CREATE INDEX "Conversation_tenantId_channel_createdAt_idx"
  ON "Conversation" ("tenantId", "channel", "createdAt");

-- FTS index on title for conversation search
CREATE INDEX "Conversation_title_fts_idx"
  ON "Conversation" USING gin(to_tsvector('english', COALESCE("title", '')));

-- ─── Message ──────────────────────────────────────────────────────────────────

CREATE TABLE "Message" (
  "id"             TEXT        NOT NULL PRIMARY KEY,
  "conversationId" TEXT        NOT NULL,
  "role"           TEXT        NOT NULL,
  "content"        TEXT        NOT NULL,
  "contentText"    TEXT,
  "status"         TEXT        NOT NULL DEFAULT 'complete',
  "model"          TEXT,
  "tokenInput"     INT,
  "tokenOutput"    INT,
  "errorMessage"   TEXT,
  "citations"      JSONB,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

CREATE INDEX "Message_conversationId_createdAt_idx"
  ON "Message" ("conversationId", "createdAt");

-- FTS index on contentText for message search
CREATE INDEX "Message_contentText_fts_idx"
  ON "Message" USING gin(to_tsvector('english', COALESCE("contentText", '')));

-- ─── ConversationDocument ─────────────────────────────────────────────────────

CREATE TABLE "ConversationDocument" (
  "id"             TEXT        NOT NULL PRIMARY KEY,
  "conversationId" TEXT        NOT NULL,
  "documentId"     TEXT        NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ConversationDocument_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE,
  CONSTRAINT "ConversationDocument_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "KbDocument"("id") ON DELETE CASCADE,
  CONSTRAINT "ConversationDocument_conversationId_documentId_key"
    UNIQUE ("conversationId", "documentId")
);

CREATE INDEX "ConversationDocument_documentId_idx"
  ON "ConversationDocument" ("documentId");

-- ─── TenantChatSettings ───────────────────────────────────────────────────────

CREATE TABLE "TenantChatSettings" (
  "id"             TEXT        NOT NULL PRIMARY KEY,
  "tenantId"       TEXT        NOT NULL UNIQUE,
  "systemPrompt"   TEXT,
  "welcomeMessage" TEXT,
  "launcherLabel"  TEXT        DEFAULT 'Chat with us',
  "logoUrl"        TEXT,
  "brandColor"     TEXT        DEFAULT '#0F172A',
  "accentColor"    TEXT        DEFAULT '#22C55E',
  "widgetTitle"    TEXT        DEFAULT 'Wren Assistant',
  "allowedOrigins" TEXT[]      NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Backfill TenantChatSettings for existing tenants ────────────────────────
-- Safe defaults: no system prompt, no origins (widget locked down until configured)
INSERT INTO "TenantChatSettings" ("id", "tenantId", "allowedOrigins", "createdAt", "updatedAt")
SELECT
  'cst_' || substr(md5(random()::text), 1, 24),
  t."id",
  '{}',
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "TenantChatSettings" cs WHERE cs."tenantId" = t."id"
);
