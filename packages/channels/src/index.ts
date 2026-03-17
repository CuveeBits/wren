/**
 * @wren/channels — Channel Adapter Library.
 *
 * Exports the ChannelAdapter interface, all related types, and the BaseAdapter
 * abstract class. Concrete adapter implementations ship in sub-directories.
 *
 * See: docs/ADR.md ADR-009 for the full architecture.
 *
 * CRITICAL: This package must NOT import from /packages/agents or /apps/api.
 */
export type {
  ChannelType,
  ChannelAdapter,
  ChannelRecipient,
  InboundMessage,
  InboundAttachment,
  OutboundMessage,
  OutboundAttachment,
  ActionButton,
  MessageHandler,
} from './types'

export { BaseAdapter } from './base-adapter'

// WebChat adapter
export { WebChatAdapter } from './webchat'
export type { WebChatConfig } from './webchat'
export { signToken, verifyToken } from './webchat/session-token-service'
export type { SessionTokenPayload, VerifyResult } from './webchat/session-token-service'
