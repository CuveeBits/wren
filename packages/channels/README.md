# @wren/channels — Channel Adapter Library

## What this module owns
The `ChannelAdapter` interface and all channel-specific implementations.

## What it does NOT do
- No agent logic
- No message routing decisions
- No business rules
- No database calls
- No state management (adapters are stateless — ADR-009)

## Public interface (key exports)

```typescript
import type { ChannelAdapter, InboundMessage, OutboundMessage, ChannelRecipient } from '@wren/channels'
```

## Build priority (ADR-009)
1. `TeamsAdapter` — highest value for German/European market
2. `SlackAdapter` — global SMBs
3. `WhatsAppAdapter` — via 360dialog (LATAM, Asia, Europe)
4. `TelegramAdapter` — developers, Eastern Europe, Asia
5. `EmailAdapter` — universal fallback
6. `WebChatAdapter` — embedded widget for PLG onboarding

## Non-obvious decisions
- **Stateless by design:** Each adapter receives and sends messages only. Session state lives in the API + Redis layer. This ensures adapters can be restarted, scaled, or swapped without data loss.
- **`sendTyping` is optional:** Not all channels support typing indicators. Adapters that don't support it simply don't implement the method.
- **`ping()` is mandatory:** Used by `GET /health` to report per-channel status.
