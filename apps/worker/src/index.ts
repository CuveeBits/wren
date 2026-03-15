/**
 * BullMQ worker entry point — @wren/worker.
 *
 * Architecture: ADR-012 (BullMQ on Redis)
 * Sprint 2: kb:index processor implemented (F-02, F-03).
 *
 * Rule 5 (CONTRIBUTING.md): Any operation >500ms must be queued here.
 * Every processor must be idempotent.
 */
import Redis from 'ioredis'
import { Worker } from 'bullmq'
import { z } from 'zod'
import { QUEUE_NAMES, createQueues } from './queues/index'
import { ingestDocument, type KbIngestJobData } from './kb/ingest'

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

const workerOptions = {
  connection,
  concurrency: 3,
}

// kb:index — document ingestion pipeline (Sprint 2)
const kbIndexWorker = new Worker(
  QUEUE_NAMES.KB_INDEX,
  async (job) => {
    console.log(`[${QUEUE_NAMES.KB_INDEX}] Processing job ${job.id}`)
    const data = job.data as KbIngestJobData
    await ingestDocument(data)
  },
  workerOptions
)

// kb:embed — individual chunk embedding (kept as stub — ingest handles embedding inline)
const kbEmbedWorker = new Worker(
  QUEUE_NAMES.KB_EMBED,
  async (job) => {
    console.log(`[${QUEUE_NAMES.KB_EMBED}] Received job ${job.id} — embedding handled inline by kb:index`)
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
  },
  workerOptions
)

// billing:meter — usage tracking (Rule 10: cost on every LLM call)
const billingWorker = new Worker(
  QUEUE_NAMES.BILLING_METER,
  async (job) => {
    console.log(`[${QUEUE_NAMES.BILLING_METER}] Received job ${job.id} — stub processor`)
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
