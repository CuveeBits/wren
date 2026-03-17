/**
 * ContextManager — Sprint 3 (F-03).
 *
 * Manages short-term conversation memory in Redis.
 * Key format: chat:messages:{tenantId}:{conversationId}
 * This format includes tenantId to prevent cross-tenant bleed in shared Redis keyspace.
 *
 * Stores the last N messages as a JSON list (TTL: 24h).
 * Max messages to keep: 10 (configurable via LAST_N_MESSAGES).
 */
import type Redis from 'ioredis'

export interface MemoryMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const LAST_N_MESSAGES = 10
const TTL_SECONDS = 86_400 // 24h

function key(tenantId: string, conversationId: string): string {
  // ADR: key must include tenantId to prevent cross-tenant bleed
  return `chat:messages:${tenantId}:${conversationId}`
}

export class ContextManager {
  constructor(private readonly redis: Redis) {}

  /**
   * Load the last N messages for a conversation from Redis.
   * Returns an empty array if no history exists.
   */
  async load(tenantId: string, conversationId: string): Promise<MemoryMessage[]> {
    const raw = await this.redis.get(key(tenantId, conversationId))
    if (!raw) return []
    try {
      return JSON.parse(raw) as MemoryMessage[]
    } catch {
      return []
    }
  }

  /**
   * Append a new message to the conversation history and trim to last N.
   * Refreshes TTL on each write.
   */
  async append(
    tenantId: string,
    conversationId: string,
    message: MemoryMessage
  ): Promise<void> {
    const k = key(tenantId, conversationId)
    const existing = await this.load(tenantId, conversationId)
    const updated = [...existing, message].slice(-LAST_N_MESSAGES)
    await this.redis.set(k, JSON.stringify(updated), 'EX', TTL_SECONDS)
  }

  /**
   * Persist a complete turn (user + assistant messages) atomically.
   */
  async persistTurn(
    tenantId: string,
    conversationId: string,
    userContent: string,
    assistantContent: string
  ): Promise<void> {
    const k = key(tenantId, conversationId)
    const existing = await this.load(tenantId, conversationId)
    const updated = [
      ...existing,
      { role: 'user' as const, content: userContent },
      { role: 'assistant' as const, content: assistantContent },
    ].slice(-LAST_N_MESSAGES)
    await this.redis.set(k, JSON.stringify(updated), 'EX', TTL_SECONDS)
  }
}
