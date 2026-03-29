-- Sprint 4: Auto-Translate — extend TenantChatSettings with translation config fields
-- Per Rule 13: all schema changes ship as migration files, never db push

ALTER TABLE "TenantChatSettings"
  ADD COLUMN IF NOT EXISTS "translationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supportedLanguages" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "defaultLanguage" TEXT NOT NULL DEFAULT 'en';
