-- Sprint 2: Knowledge Base (Infobase) schema migration
-- Replaces Sprint 0 KB scaffold with full Sprint 2 KB models + pgvector

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop old Sprint 0 scaffold tables and enums (never in production)
DROP TABLE IF EXISTS "KBChunk" CASCADE;
DROP TABLE IF EXISTS "KBDocument" CASCADE;
DROP TABLE IF EXISTS "KnowledgeBase" CASCADE;
DROP TYPE IF EXISTS "KBType" CASCADE;
DROP TYPE IF EXISTS "DocStatus" CASCADE;

-- KnowledgeBase: one per tenant
CREATE TABLE "KnowledgeBase" (
  "id"        TEXT         NOT NULL PRIMARY KEY,
  "tenantId"  TEXT         NOT NULL UNIQUE,
  "name"      TEXT         NOT NULL DEFAULT 'Knowledge Base',
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "KnowledgeBase_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- KbCollection: optional document grouping
CREATE TABLE "KbCollection" (
  "id"              TEXT         NOT NULL PRIMARY KEY,
  "knowledgeBaseId" TEXT         NOT NULL,
  "parentId"        TEXT,
  "name"            TEXT         NOT NULL,
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "KbCollection_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE,
  CONSTRAINT "KbCollection_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "KbCollection"("id")
);

CREATE INDEX "KbCollection_knowledgeBaseId_idx" ON "KbCollection"("knowledgeBaseId");

-- KbDocument: uploaded or generated document
CREATE TABLE "KbDocument" (
  "id"              TEXT         NOT NULL PRIMARY KEY,
  "knowledgeBaseId" TEXT         NOT NULL,
  "collectionId"    TEXT,
  "title"           TEXT         NOT NULL,
  "fileName"        TEXT         NOT NULL,
  "mimeType"        TEXT         NOT NULL,
  "sizeBytes"       INT          NOT NULL,
  "storageKey"      TEXT         NOT NULL,
  "source"          TEXT         NOT NULL DEFAULT 'upload',
  "status"          TEXT         NOT NULL DEFAULT 'processing',
  "errorMessage"    TEXT,
  "tags"            TEXT[]       NOT NULL DEFAULT '{}',
  "summary"         TEXT,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "KbDocument_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE,
  CONSTRAINT "KbDocument_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "KbCollection"("id") ON DELETE SET NULL
);

CREATE INDEX "KbDocument_knowledgeBaseId_idx" ON "KbDocument"("knowledgeBaseId");
CREATE INDEX "KbDocument_collectionId_idx" ON "KbDocument"("collectionId");
CREATE INDEX "KbDocument_title_fts_idx" ON "KbDocument" USING gin(to_tsvector('english', "title"));

-- KbChunk: text chunk with pgvector embedding
CREATE TABLE "KbChunk" (
  "id"         TEXT         NOT NULL PRIMARY KEY,
  "documentId" TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "tokenCount" INT          NOT NULL,
  "chunkIndex" INT          NOT NULL,
  "pageNumber" INT,
  "embedding"  vector(768),
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "KbChunk_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "KbDocument"("id") ON DELETE CASCADE
);

CREATE INDEX "KbChunk_documentId_idx" ON "KbChunk"("documentId");
CREATE INDEX "KbChunk_content_fts_idx" ON "KbChunk" USING gin(to_tsvector('english', "content"));
-- HNSW index for fast cosine similarity ANN search
CREATE INDEX "kb_chunk_embedding_hnsw"
  ON "KbChunk" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
