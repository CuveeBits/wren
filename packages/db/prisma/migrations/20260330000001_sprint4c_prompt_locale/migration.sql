-- Sprint 4c: Add TenantPromptLocale table for per-tenant prompt translations
CREATE TABLE "TenantPromptLocale" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "promptId"    TEXT NOT NULL,
    "locale"      TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stale"       BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TenantPromptLocale_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one translation per tenant/prompt/locale
ALTER TABLE "TenantPromptLocale"
    ADD CONSTRAINT "TenantPromptLocale_tenantId_promptId_locale_key"
    UNIQUE ("tenantId", "promptId", "locale");

-- Index for fast tenant+locale lookups
CREATE INDEX "TenantPromptLocale_tenantId_locale_idx"
    ON "TenantPromptLocale"("tenantId", "locale");

-- Foreign keys
ALTER TABLE "TenantPromptLocale"
    ADD CONSTRAINT "TenantPromptLocale_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantPromptLocale"
    ADD CONSTRAINT "TenantPromptLocale_promptId_fkey"
    FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
