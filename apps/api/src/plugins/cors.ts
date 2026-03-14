import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

/**
 * CORS plugin.
 * In development: allow all origins.
 * In production: restrict to configured origins.
 */
export async function corsPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(cors, {
    origin:
      process.env['NODE_ENV'] === 'production'
        ? [
            process.env['NEXT_PUBLIC_API_URL'] ?? 'https://app.wren.ai',
          ]
        : true, // allow all in dev
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
}
