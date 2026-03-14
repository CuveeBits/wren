/**
 * @wren/channels — Channel Adapter Library.
 *
 * Exports the ChannelAdapter interface and all related types.
 * Concrete adapter implementations (Teams, Slack, etc.) ship in separate
 * sub-packages and are registered at runtime in /apps/api.
 *
 * See: docs/ADR.md ADR-009 for the full architecture.
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
