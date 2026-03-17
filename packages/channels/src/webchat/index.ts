/**
 * WebChatAdapter — Sprint 3 (F-08).
 *
 * Implements ChannelAdapter for the embeddable WebChat widget.
 * Inbound messages arrive via HTTP POST (Fastify route → this.handleInbound).
 * Outbound messages are written to the active SSE stream via StreamRegistry.
 *
 * ADR-009: adapters are stateless — SSE stream registry is injected.
 * This package must NOT import from /packages/agents or /apps/api.
 */
import { BaseAdapter } from '../base-adapter'
import type { ChannelRecipient, OutboundMessage, InboundMessage } from '../types'
import { StreamRegistry } from './stream-registry'

export { StreamRegistry } from './stream-registry'
export { signToken, verifyToken } from './session-token-service'
export type { SessionTokenPayload, VerifyResult } from './session-token-service'

export interface WebChatConfig {
  widgetTitle: string
  launcherLabel: string
  welcomeMessage: string | null
  logoUrl: string | null
  brandColor: string
  accentColor: string
}

export class WebChatAdapter extends BaseAdapter {
  readonly id = 'webchat' as const
  readonly name = 'WebChat'

  private readonly streamRegistry: StreamRegistry

  constructor(streamRegistry?: StreamRegistry) {
    super()
    this.streamRegistry = streamRegistry ?? new StreamRegistry()
  }

  /**
   * Send a message to a WebChat session via SSE.
   * Writes to the active SSE response stream mapped by recipient.channelSessionId.
   */
  async sendMessage(recipient: ChannelRecipient, message: OutboundMessage): Promise<void> {
    const payload: Record<string, unknown> = {}
    if (message.text) payload.text = message.text
    if (message.markdown) payload.markdown = message.markdown

    const written = this.streamRegistry.write(recipient.channelSessionId, payload)
    if (!written) {
      // Client disconnected — this is non-fatal for SSE-based channels
      console.warn(`[WebChatAdapter] No active stream for session ${recipient.channelSessionId}`)
    }
  }

  /**
   * Send a typing indicator to a WebChat session.
   */
  override async sendTyping(recipient: ChannelRecipient): Promise<void> {
    this.streamRegistry.write(recipient.channelSessionId, { type: 'typing' })
  }

  /**
   * Called by Fastify route after session token validation.
   * Dispatches to the registered message handler.
   */
  async handleInbound(message: InboundMessage, tenantId: string, userId: string): Promise<void> {
    if (!this._handler) {
      throw new Error('WebChatAdapter: no message handler registered')
    }
    await this._handler(message, tenantId, userId)
  }

  /** Get the stream registry for use by Fastify routes */
  getStreamRegistry(): StreamRegistry {
    return this.streamRegistry
  }

  /** Always healthy — stateless HTTP adapter */
  override async ping(): Promise<boolean> {
    return true
  }
}
