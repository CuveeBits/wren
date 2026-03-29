/**
 * promptLocaleStale.ts — Sprint 4c (F-05).
 *
 * Utility to mark TenantPromptLocale rows as stale when a Prompt is mutated.
 * Import and call markPromptLocalesStale() wherever prompts are created, updated, or deleted.
 */
import { db } from '@wren/db'

/**
 * Mark all TenantPromptLocale rows for a given promptId as stale.
 * Called on Prompt create/update/delete so the next GET triggers re-translation.
 * Fire-and-forget safe — errors are logged but do not propagate.
 */
export async function markPromptLocalesStale(promptId: string): Promise<void> {
  await db.tenantPromptLocale.updateMany({
    where: { promptId },
    data: { stale: true },
  })
}

/**
 * Mark all TenantPromptLocale rows for all prompts of a tenant as stale.
 * Called when bulk prompt changes happen.
 */
export async function markAllPromptLocalesStale(tenantId: string): Promise<void> {
  await db.tenantPromptLocale.updateMany({
    where: { tenantId },
    data: { stale: true },
  })
}
