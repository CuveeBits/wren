/**
 * Fastify API server entry point — @wren/api.
 *
 * Architecture: ADR-003 (Fastify on Node.js)
 * All env vars are loaded from config.ts (Rule 7).
 */
import Fastify from 'fastify'
import Redis from 'ioredis'
import { config } from './config'
import { corsPlugin } from './plugins/cors'
import { rateLimitPlugin } from './plugins/rateLimit'
import { authPlugin } from './plugins/auth'
import { registerRoutes } from './routes/index'

process.on('uncaughtException', (err) => {
  console.error('[api] Uncaught exception (process will NOT exit):', err)
  // Do not call process.exit() — let the server keep running
})

process.on('unhandledRejection', (reason) => {
  console.error('[api] Unhandled promise rejection (process will NOT exit):', reason)
  // Do not call process.exit() — let the server keep running
})

async function start(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      ...(config.nodeEnv === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }
        : {}),
    },
  })

  // ── Redis client ─────────────────────────────────────────────────────────────
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis connection error')
  })

  // ── Plugins ──────────────────────────────────────────────────────────────────
  // Accept multipart/form-data as raw buffer for KB upload route (Spark custom parser)
  fastify.addContentTypeParser('multipart/form-data', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body)
  })
  await corsPlugin(fastify)
  await rateLimitPlugin(fastify)
  await authPlugin(fastify)

  // ── Routes ───────────────────────────────────────────────────────────────────
  await registerRoutes(fastify, { redis })

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`)
    await fastify.close()
    await redis.quit()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  // ── Start ────────────────────────────────────────────────────────────────────
  await fastify.listen({ port: config.port, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error('❌ Failed to start API server:', err)
  process.exit(1)
})
