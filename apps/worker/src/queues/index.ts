/**
 * BullMQ queue definitions — ADR-012.
 *
 * All async/background operations MUST go through these queues (Rule 5, CONTRIBUTING.md).
 * Processors ship in Sprint 3+ (KB indexing), Sprint 2 (agent:run), etc.
 *
 * Every job processor must be idempotent (safe to retry on failure).
 */
import { Queue } from 'bullmq'
import type Redis from 'ioredis'

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  KB_INDEX: 'kb-index',
  KB_EMBED: 'kb-embed',
  AGENT_RUN: 'agent-run',
  NOTIFICATION_SEND: 'notification-send',
  WORKFLOW_TRIGGER: 'workflow-trigger',
  REPORT_GENERATE: 'report-generate',
  BILLING_METER: 'billing-meter',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// ─── Queue factory ────────────────────────────────────────────────────────────

export function createQueues(connection: Redis): Record<QueueName, Queue> {
  const defaultOptions = {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  }

  return {
    [QUEUE_NAMES.KB_INDEX]: new Queue(QUEUE_NAMES.KB_INDEX, defaultOptions),
    [QUEUE_NAMES.KB_EMBED]: new Queue(QUEUE_NAMES.KB_EMBED, defaultOptions),
    [QUEUE_NAMES.AGENT_RUN]: new Queue(QUEUE_NAMES.AGENT_RUN, defaultOptions),
    [QUEUE_NAMES.NOTIFICATION_SEND]: new Queue(QUEUE_NAMES.NOTIFICATION_SEND, defaultOptions),
    [QUEUE_NAMES.WORKFLOW_TRIGGER]: new Queue(QUEUE_NAMES.WORKFLOW_TRIGGER, defaultOptions),
    [QUEUE_NAMES.REPORT_GENERATE]: new Queue(QUEUE_NAMES.REPORT_GENERATE, defaultOptions),
    [QUEUE_NAMES.BILLING_METER]: new Queue(QUEUE_NAMES.BILLING_METER, defaultOptions),
  } as Record<QueueName, Queue>
}
