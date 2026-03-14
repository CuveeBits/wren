/**
 * Database seed script — Sprint 0.
 * Creates a demo tenant with one admin user, one default agent, and one knowledge base.
 *
 * Usage: pnpm db:seed
 * Requires: SEED_CLERK_USER_ID env var (your Clerk user ID)
 */
import { PrismaClient, Plan, UserRole, KBType } from '@prisma/client'

const db = new PrismaClient()

async function main(): Promise<void> {
  const clerkUserId = process.env['SEED_CLERK_USER_ID']

  if (!clerkUserId) {
    console.warn(
      '⚠️  SEED_CLERK_USER_ID not set — skipping TenantUser creation. Set it in .env to create an admin user.'
    )
  }

  console.log('🌱 Starting database seed...')

  // ── Tenant ───────────────────────────────────────────────────────────────
  const tenant = await db.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      clerkOrgId: 'org_demo_placeholder', // Replace with real Clerk org ID
      slug: 'demo',
      name: 'Demo Company',
      plan: Plan.TRIAL,
      whiteLabelConfig: null,
      settings: {},
    },
  })
  console.log(`✅ Tenant created: ${tenant.id} (slug: ${tenant.slug})`)

  // ── TenantUser ───────────────────────────────────────────────────────────
  if (clerkUserId) {
    const user = await db.tenantUser.upsert({
      where: {
        tenantId_clerkUserId: {
          tenantId: tenant.id,
          clerkUserId,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        clerkUserId,
        role: UserRole.TENANT_ADMIN,
      },
    })
    console.log(`✅ TenantUser created: ${user.id} (role: ${user.role})`)
  }

  // ── Default Agent ─────────────────────────────────────────────────────────
  const agent = await db.agent.upsert({
    where: {
      // Use a stable compound to avoid duplicate on re-seed
      id: `demo-agent-${tenant.id}`,
    },
    update: {},
    create: {
      id: `demo-agent-${tenant.id}`,
      tenantId: tenant.id,
      name: 'Assistant',
      description: 'The default AI assistant for Demo Company',
      systemPrompt:
        'You are a helpful AI assistant for Demo Company. You help employees with their daily tasks, answer questions, and provide information. Always be professional, concise, and helpful.',
      modelId: 'gpt-4o',
      memorySize: 20,
      maxTokens: 4000,
      isDefault: true,
      isActive: true,
      tools: [],
      kbInstanceIds: [],
    },
  })
  console.log(`✅ Agent created: ${agent.id} (name: ${agent.name})`)

  // ── Knowledge Base ────────────────────────────────────────────────────────
  const kb = await db.knowledgeBase.upsert({
    where: {
      id: `demo-kb-${tenant.id}`,
    },
    update: {},
    create: {
      id: `demo-kb-${tenant.id}`,
      tenantId: tenant.id,
      name: 'Company Knowledge',
      description: 'Core company knowledge base',
      type: KBType.VECTOR,
      resultLimit: 5,
    },
  })
  console.log(`✅ KnowledgeBase created: ${kb.id} (name: ${kb.name})`)

  console.log('')
  console.log('─── Seed Summary ────────────────────────────────────────────')
  console.log(`Tenant ID:        ${tenant.id}`)
  console.log(`Tenant slug:      ${tenant.slug}`)
  console.log(`Agent ID:         ${agent.id}`)
  console.log(`KnowledgeBase ID: ${kb.id}`)
  console.log('─────────────────────────────────────────────────────────────')
  console.log('✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => {
    void db.$disconnect()
  })
