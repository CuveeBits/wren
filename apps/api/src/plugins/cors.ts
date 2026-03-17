import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

export async function corsPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, server-side) or from any localhost/LAN
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.12.1')) {
        cb(null, true)
      } else {
        cb(null, false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
}
