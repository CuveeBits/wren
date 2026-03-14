/**
 * @wren/agents — Agent Runtime.
 * Sprint 0: stub only. Full implementation in Sprint 2.
 *
 * Responsibilities (when implemented):
 * - Context assembly (memory + KB retrieval)
 * - LLM call orchestration via @wren/llm
 * - Tool dispatch (execute approved tools, return results)
 * - Memory read/write (Redis short-term + Postgres long-term)
 * - Response streaming to channel adapters
 *
 * Critical rule: All methods accept tenantId and userId as required parameters.
 * Agents are multi-tenant-aware from line one (ADR-007).
 */

// TODO(sprint-2): implement AgentRuntime class
// TODO(sprint-2): implement ContextManager (Redis + pgvector)
// TODO(sprint-2): implement ToolDispatcher
// TODO(sprint-2): implement PromptAssembler

export const AGENTS_VERSION = '0.1.0'
