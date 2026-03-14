/**
 * BullMQ worker entry point — @wren/worker.
 *
 * Architecture: ADR-012 (BullMQ on Redis)
 * Sprint 0: queues are defined but processors are empty stubs.
 * Full processors ship in Sprint 2+ as features are built.
 *
 * Rule 5 (CONTRIBUTING.md): Any operation >500ms must be queued here.
 * Every processor must be idempotent.
 */
import Redis from 'ioredis'
import { Worker } from 'bullmq'
import { z } from 'zod'
import { QUEUE_NAMES, createQueues } from './queues/index'

// ── Config (Rule 7: env vars validated once) ──────────────────────────────────
const WorkerConfigSchema = z.object({
  redisUrl: z.string().url('REDIS_URL must be a valid URL'),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
})

const configResult = WorkerConfigSchema.safeParse({
  redisUrl: process.env['REDIS_URL'],
  nodeEnv: process.env['NODE_ENV'],
})

if (!configResult.success) {
  console.error('❌ Invalid worker configuration:')
  console.error(configResult.error.flatten().fieldErrors)
  process.exit(1)
}

const workerConfig = configResult.data

// ── Redis connection ──────────────────────────────────────────────────────────
const connection = new Redis(workerConfig.redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
})

connection.on('error', (err) => {
  console.error('Redis connection error:', err)
})

// ── Queue instances (for adding jobs from other services) ─────────────────────
const _queues = createQueues(connection)

// ── Workers ───────────────────────────────────────────────────────────────────
// Sprint 0: stub workers that log receipt and do nothing.
// Replace with real processors as sprints are built.

const workerOptions = {
  connection,
  concurrency: 5,
}

// kb:index — document ingestion pipeline (Sprint 3)
const kbIndexWorker = new Worker(
  QUEUE_NAMES.KB_INDEX,
  async (job) => {
    console.log(`[${QUEUE_NAMES.KB_INDEX}] Received job ${job.id} — stub processor (Sprint 3)`)
    // TODO(sprint-3): download file, parse, chunk, queue kb:embed jobs
  },
  workerOptions
)

// kb:embed — embedding generation (Sprint 3)
const kbEmbedWorker = new Worker(
  QUEUE_NAMES.KB_EMBED,
  async (job) => {
    console.log(`[${QUEUE_NAMES.KB_EMBED}] Received job ${job.id} — stub processor (Sprint 3)`)
    // TODO(sprint-3): generate embeddings via @wren/llm, store KBChunk
  },
  workerOptions
)

// agent:run — non-real-time agent execution (Sprint 2)
const agentRunWorker = new Worker(
  QUEUE_NAMES.AGENT_RUN,
  async (job) => {
    console.log(`[${QUEUE_NAMES.AGENT_RUN}] Received job ${job.id} — stub processor (Sprint 2)`)
    // TODO(sprint-2): execute agent via @wren/agents
  },
  workerOptions
)

// notification:send — outbound channel messages
const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATION_SEND,
  async (job) => {
    console.log(`[${QUEUE_NAMES.NOTIFICATION_SEND}] Received job ${job.id} — stub processor`)
    // TODO(sprint-4): send via channel adapters
  },
  workerOptions
)

// billing:meter — usage tracking (Rule 10: cost on every LLM call)
const billingWorker = new Worker(
  QUEUE_NAMES.BILLING_METER,
  async (job) => {
    console.log(`[${QUEUE_NAMES.BILLING_METER}] Received job ${job.id} — stub processor`)
    // TODO(sprint-2): record token usage, compute cost, update tenant usage
  },
  workerOptions
)

// ── Error handlers ────────────────────────────────────────────────────────────
for (const worker of [
  kbIndexWorker,
  kbEmbedWorker,
  agentRunWorker,
  notificationWorker,
  billingWorker,
]) {
  worker.on('failed', (job, err) => {
    console.error(`Worker job failed: ${job?.id}`, err)
  })
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down workers gracefully...`)
  await Promise.all([
    kbIndexWorker.close(),
    kbEmbedWorker.close(),
    agentRunWorker.close(),
    notificationWorker.close(),
    billingWorker.close(),
  ])
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

console.log('✅ Wren worker started. Listening for jobs...')
console.log(`   Environment: ${workerConfig.nodeEnv}`)
console.log(`   Queues: ${Object.values(QUEUE_NAMES).join(', ')}`)
