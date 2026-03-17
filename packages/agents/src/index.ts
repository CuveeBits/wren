/**
 * @wren/agents — Agent Runtime.
 * Sprint 3: ChatAgent, ContextManager, PromptAssembler implemented.
 *
 * Critical rule: All LLM calls through @wren/llm → LiteLLM proxy.
 * Never import from /packages/channels. Never use LangChain/CrewAI.
 * All methods accept tenantId and userId as required parameters (ADR-007).
 */

export { ChatAgent } from './chat-agent'
export type { ChatAgentOptions } from './chat-agent'

export { ContextManager } from './context-manager'
export type { MemoryMessage } from './context-manager'

export { assembleMessages } from './prompt-assembler'
export type { ChatMessage, AssembleOptions } from './prompt-assembler'

export type {
  ConversationContext,
  AgentStreamChunk,
  AgentTurnResult,
  CitationRef,
  KbChunkResult,
} from './types'

export const AGENTS_VERSION = '0.3.0'
