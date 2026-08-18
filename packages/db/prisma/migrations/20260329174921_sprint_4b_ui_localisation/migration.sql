-- Sprint 4b: UI Localisation
-- Add preferredLocale to TenantUser
ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT NOT NULL DEFAULT 'en';

-- Create TenantLocale table for tenant-level translation cache
CREATE TABLE IF NOT EXISTS "TenantLocale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "translations" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantLocale_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one translation blob per tenant per locale
CREATE UNIQUE INDEX IF NOT EXISTS "TenantLocale_tenantId_locale_key" ON "TenantLocale"("tenantId", "locale");

-- Foreign key
ALTER TABLE "TenantLocale" ADD CONSTRAINT "TenantLocale_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
