/**
 * ChannelAdapter interface — ADR-009.
 *
 * All channel implementations (Teams, Slack, WhatsApp, Telegram, Email, WebChat)
 * MUST implement ChannelAdapter.
 *
 * Rule 6 (CONTRIBUTING.md): Adapters are stateless. State lives in the API/DB layer.
 * This package does NOT contain business logic, DB calls, or routing decisions.
 */

// ─── Channel Types ────────────────────────────────────────────────────────────

export type ChannelType =
  | 'teams'
  | 'slack'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'webchat'

// ─── Inbound ─────────────────────────────────────────────────────────────────

export interface InboundAttachment {
  type: 'image' | 'file' | 'audio' | 'video'
  url: string
  mimeType?: string
  filename?: string
  sizeBytes?: number
}

export interface InboundMessage {
  channelType: ChannelType
  /** Channel-native message ID (e.g. Teams message ID, Slack ts) */
  channelMessageId: string
  /** Channel-native user ID */
  channelUserId: string
  /** Channel-native thread/session ID */
  channelSessionId: string
  text: string
  attachments?: InboundAttachment[]
  /** Channel-specific metadata (headers, event type, etc.) */
  metadata?: Record<string, unknown>
  receivedAt: Date
}

// ─── Outbound ─────────────────────────────────────────────────────────────────

export interface OutboundAttachment {
  type: 'file' | 'image'
  url: string
  filename?: string
}

export interface ActionButton {
  id: string
  label: string
  value: string
}

export interface OutboundMessage {
  /** Plain text fallback (always provide for accessibility) */
  text?: string
  /** Markdown-formatted message body (channel permitting) */
  markdown?: string
  attachments?: OutboundAttachment[]
  /** Interactive action buttons (channel permitting) */
  actions?: ActionButton[]
}

export interface ChannelRecipient {
  channelUserId: string
  channelSessionId: string
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/**
 * Handler registered via ChannelAdapter.onMessage().
 * Called for every inbound message the adapter receives.
 * tenantId and userId are resolved by the API layer before calling the handler.
 */
export type MessageHandler = (
  message: InboundMessage,
  tenantId: string,
  userId: string
) => Promise<void>

// ─── ChannelAdapter Interface ─────────────────────────────────────────────────

/**
 * The contract every channel adapter must fulfil.
 * Build priority (ADR-009):
 *   1. TeamsAdapter
 *   2. SlackAdapter
 *   3. WhatsAppAdapter (via 360dialog)
 *   4. TelegramAdapter
 *   5. EmailAdapter
 *   6. WebChatAdapter
 */
export interface ChannelAdapter {
  readonly id: ChannelType
  readonly name: string

  /** Register handler for inbound messages. Called once at startup. */
  onMessage(handler: MessageHandler): void

  /** Send a message to a recipient. */
  sendMessage(recipient: ChannelRecipient, message: OutboundMessage): Promise<void>

  /**
   * Send a typing indicator (optional — not all channels support it).
   * Implement as a no-op if the channel does not support typing indicators.
   */
  sendTyping?(recipient: ChannelRecipient): Promise<void>

  /**
   * Health check — returns true if the channel is reachable and configured correctly.
   * Used by GET /health and monitoring.
   */
  ping(): Promise<boolean>
}
