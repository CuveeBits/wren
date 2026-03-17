/**
 * BaseAdapter — Sprint 3 (F-07).
 *
 * Abstract base class that provides default implementations for optional
 * ChannelAdapter methods. Concrete adapters extend this and override what they need.
 *
 * Rule: This package must NOT import from /packages/agents or /apps/api.
 * Channel adapters are stateless — no DB calls, no LLM calls, no business logic.
 */
import type {
  ChannelAdapter,
  ChannelType,
  ChannelRecipient,
  OutboundMessage,
  MessageHandler,
} from './types'

export abstract class BaseAdapter implements ChannelAdapter {
  abstract readonly id: ChannelType
  abstract readonly name: string

  protected _handler: MessageHandler | null = null

  /** Register inbound message handler. Called once at startup by the API layer. */
  onMessage(handler: MessageHandler): void {
    this._handler = handler
  }

  /** Send a message to a recipient. Must be implemented by concrete adapters. */
  abstract sendMessage(recipient: ChannelRecipient, message: OutboundMessage): Promise<void>

  /**
   * Send a typing indicator.
   * Default no-op — override in adapters that support it.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendTyping(_recipient: ChannelRecipient): Promise<void> {
    // No-op default. Override in channels that support typing indicators.
  }

  /**
   * Health check.
   * Default returns true (stateless HTTP adapters are always "healthy").
   * Override for adapters with real connectivity dependencies (Teams bot, etc.).
   */
  async ping(): Promise<boolean> {
    return true
  }
}
