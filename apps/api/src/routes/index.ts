/**
 * Route registration.
 * Import and register all route modules here.
 */
import type { FastifyInstance } from 'fastify'
import type Redis from 'ioredis'
import { healthRoutes } from './health'
import { promptRoutes } from './prompts'
import { kbContextRoutes } from './kb/context'

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
      await v1.register(promptRoutes,    { prefix: '/prompts' })
      await v1.register(kbContextRoutes, { prefix: '/kb/context' })
    },
    { prefix: '/api/v1' }
  )
}
