/**
 * API configuration — Rule 7 (CONTRIBUTING.md).
 * All environment variables are read and validated ONCE, here.
 * No other file in this app may access process.env directly.
 */
import { z } from 'zod'

const ConfigSchema = z.object({
  // Server
  port: z.coerce.number().int().min(1).max(65535).default(3001),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),

  // Database (Postgres via Prisma)
  databaseUrl: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  redisUrl: z.string().url('REDIS_URL must be a valid URL'),

  // Clerk Auth
  clerkPublishableKey: z.string().startsWith('pk_', 'CLERK_PUBLISHABLE_KEY must start with pk_'),
  clerkSecretKey: z.string().startsWith('sk_', 'CLERK_SECRET_KEY must start with sk_'),

  // LiteLLM
  litellmBaseUrl: z.string().url('LITELLM_BASE_URL must be a valid URL'),
  litellmApiKey: z.string().min(1, 'LITELLM_API_KEY is required'),
})

function loadConfig() {
  const result = ConfigSchema.safeParse({
    port: process.env['API_PORT'],
    nodeEnv: process.env['NODE_ENV'],
    databaseUrl: process.env['DATABASE_URL'],
    redisUrl: process.env['REDIS_URL'],
    clerkPublishableKey: process.env['CLERK_PUBLISHABLE_KEY'],
    clerkSecretKey: process.env['CLERK_SECRET_KEY'],
    litellmBaseUrl: process.env['LITELLM_BASE_URL'],
    litellmApiKey: process.env['LITELLM_API_KEY'],
  })

  if (!result.success) {
    console.error('❌ Invalid environment configuration:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }

  return result.data
}

export const config = loadConfig()
