/**
 * GET /health — system health check.
 *
 * PUBLIC ENDPOINT — reason: required by Docker health checks, load balancers,
 * and monitoring systems. No business data is exposed.
 *
 * Returns 200 + { status: 'ok' } when all services are healthy.
 * Returns 503 + { status: 'degraded' } when any service is down.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@wren/db'
import type Redis from 'ioredis'

interface ServiceStatus {
  database: 'ok' | 'error'
  redis: 'ok' | 'error'
}

interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  services: ServiceStatus
  version: string
}

export async function healthRoutes(
  fastify: FastifyInstance,
  options: { redis: Redis }
): Promise<void> {
  // PUBLIC ENDPOINT — reason: see file header
  fastify.get(
    '/health',
    async (_request: FastifyRequest, reply: FastifyReply): Promise<HealthResponse> => {
      const services: ServiceStatus = {
        database: 'error',
        redis: 'error',
      }

      // Check database
      try {
        await db.$queryRaw`SELECT 1`
        services.database = 'ok'
      } catch (err) {
        fastify.log.error({ err }, 'Health check: database is down')
      }

      // Check Redis
      try {
        const pong = await options.redis.ping()
        if (pong === 'PONG') {
          services.redis = 'ok'
        }
      } catch (err) {
        fastify.log.error({ err }, 'Health check: redis is down')
      }

      const allOk = services.database === 'ok' && services.redis === 'ok'

      const response: HealthResponse = {
        status: allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
        version: '0.1.0',
      }

      return reply.status(allOk ? 200 : 503).send(response)
    }
  )
}
