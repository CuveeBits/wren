/**
 * Route registration.
 * Import and register all route modules here.
 */
import type { FastifyInstance } from 'fastify'
import type Redis from 'ioredis'
import { healthRoutes } from './health'
import { kbRoutes } from './kb'
import { promptRoutes } from './prompts'
import { kbContextRoutes } from './kb/context'
import { chatRoutes } from './chat'
import { widgetRoutes } from './widget'
import { translationRoutes } from './translation'
import { localeRoutes } from './locale'
import { promptLocaleRoutes } from './prompt-locale'

interface RouteOptions {
  redis: Redis
}

export async function registerRoutes(
  fastify: FastifyInstance,
  options: RouteOptions
): Promise<void> {
  // PUBLIC ENDPOINT — reason: health check for load balancers and monitoring
  await fastify.register(healthRoutes, { prefix: '/', redis: options.redis })

  // Versioned API routes
  await fastify.register(
    async (v1) => {
      await v1.register(promptRoutes, { prefix: '/prompts' })
      await v1.register(kbRoutes, { prefix: '/kb', redis: options.redis })
      await v1.register(kbContextRoutes, { prefix: '/kb/context' })
      // Sprint 3: Chat interface routes (S-01 through S-09)
      await v1.register(chatRoutes, { prefix: '/chat' })
      // Sprint 4: Translation routes (S-01)
      await v1.register(translationRoutes, { prefix: '/translate' })
      // Sprint 4b: tenant locale routes (UI i18n generation + retrieval)
      await v1.register(localeRoutes, { prefix: '/tenant/locale' })
      // Sprint 4c: prompt locale routes (prompt translation + retrieval)
      await v1.register(promptLocaleRoutes, { prefix: '/tenant/prompts' })
    },
    { prefix: '/api/v1' }
  )

  // PUBLIC widget routes — origin-gated, HMAC session token auth (S-09)
  // Registered outside /api/v1 prefix — served at /widget/:tenantSlug/...
  await fastify.register(widgetRoutes, { prefix: '/widget' })
}
