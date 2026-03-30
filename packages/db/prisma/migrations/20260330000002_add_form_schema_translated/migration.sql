-- Sprint 4c (form fields): Add formSchemaTranslated column to TenantPromptLocale
-- Stores translated JSON Schema for form field labels/placeholders
ALTER TABLE "TenantPromptLocale"
    ADD COLUMN "formSchemaTranslated" JSONB;
