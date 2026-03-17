/**
 * Chat route aggregator — registers all /api/v1/chat/* routes.
 *
 * Routes registered:
 *   /conversations  → chatConversationRoutes (S-01 through S-07)
 *   /settings       → chatSettingsRoutes (S-08)
 */
import type { FastifyInstance } from 'fastify'
import { chatConversationRoutes } from './conversations'
import { chatSettingsRoutes } from './settings'

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(chatConversationRoutes, { prefix: '/conversations' })
  await fastify.register(chatSettingsRoutes, { prefix: '/settings' })
}
