import type { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'

/**
 * Rate limit plugin.
 * Protects against abuse. Per-IP limits; can be extended to per-tenant in Sprint 2.
 */
export async function rateLimitPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // PUBLIC ENDPOINT — reason: health checks must bypass rate limits for monitoring
    skipOnError: true,
    allowList: ['/health'],
  })
}
