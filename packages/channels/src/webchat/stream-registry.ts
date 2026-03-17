/**
 * StreamRegistry — Sprint 3 (F-08).
 *
 * Maps sessionId → active SSE response stream.
 * Used by WebChatAdapter.sendMessage to write chunks to the correct client.
 *
 * In-memory — works for single-instance deployments (Sprint 3).
 * Multi-instance: replace with Redis pub/sub (Sprint 8+).
 *
 * Rule: stateless from the adapter perspective — state lives here, not in the adapter.
 */

export interface SseStream {
  write(chunk: string): boolean
  on(event: 'close', listener: () => void): void
}

export class StreamRegistry {
  private readonly streams = new Map<string, SseStream>()

  /**
   * Register an active SSE stream for a session.
   * The session's stream will be automatically removed on connection close.
   */
  register(sessionId: string, stream: SseStream): void {
    this.streams.set(sessionId, stream)
    stream.on('close', () => {
      this.streams.delete(sessionId)
    })
  }

  /**
   * Write a JSON-serialisable payload to an active stream.
   * Returns false if the session has no active stream (client disconnected).
   */
  write(sessionId: string, payload: Record<string, unknown>): boolean {
    const stream = this.streams.get(sessionId)
    if (!stream) return false
    return stream.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  /**
   * Remove a stream registration explicitly.
   * (Usually handled by the 'close' event, but useful for cleanup on errors.)
   */
  remove(sessionId: string): void {
    this.streams.delete(sessionId)
  }

  /** Check if a session has an active stream. */
  has(sessionId: string): boolean {
    return this.streams.has(sessionId)
  }

  /** Number of active streams. */
  get size(): number {
    return this.streams.size
  }
}
