-- Sprint 4c: Prompt Translation
-- Add TenantPromptLocale table for per-tenant translated prompt titles/descriptions

CREATE TABLE IF NOT EXISTS "TenantPromptLocale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TenantPromptLocale_pkey" PRIMARY KEY ("id")
);

-- Unique constraint per tenant+prompt+locale
CREATE UNIQUE INDEX IF NOT EXISTS "TenantPromptLocale_tenantId_promptId_locale_key"
    ON "TenantPromptLocale"("tenantId", "promptId", "locale");

-- Index for fast locale lookups per tenant
CREATE INDEX IF NOT EXISTS "TenantPromptLocale_tenantId_locale_idx"
    ON "TenantPromptLocale"("tenantId", "locale");

-- Foreign key: tenant
ALTER TABLE "TenantPromptLocale"
    ADD CONSTRAINT "TenantPromptLocale_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign key: prompt (cascade delete)
ALTER TABLE "TenantPromptLocale"
    ADD CONSTRAINT "TenantPromptLocale_promptId_fkey"
    FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
