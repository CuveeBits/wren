/**
 * Clerk JWT authentication plugin — Rule 3 (CONTRIBUTING.md).
 *
 * Every protected Fastify route must have `{ preHandler: [authenticate] }`.
 * Public endpoints must be explicitly marked with a comment explaining why they're public.
 *
 * This plugin:
 * 1. Verifies the Clerk JWT from the Authorization header
 * 2. Extracts clerkUserId, clerkOrgId
 * 3. Resolves the platform tenantId from clerkOrgId (DB lookup)
 * 4. Attaches the full AuthContext to request.auth
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { clerkPlugin, getAuth } from '@clerk/fastify'
import { db } from '@wren/db'
import type { AuthContext, UserRole } from '@wren/types'
import { config } from '../config'

/**
 * Register the Clerk plugin on the Fastify instance.
 * Call this once at startup before registering routes.
 */
export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(clerkPlugin, {
    publishableKey: config.clerkPublishableKey,
    secretKey: config.clerkSecretKey,
  })
}

/**
 * Authenticate preHandler — attach to any protected route.
 *
 * Usage:
 *   fastify.get('/agents', { preHandler: [authenticate] }, handler)
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { userId, orgId, sessionClaims } = getAuth(request)

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Valid Clerk session required' })
  }

  if (!orgId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'An active organization is required. Please select or create a workspace.',
    })
  }

  // Resolve the platform Tenant from Clerk org ID
  // Rule 1: every query on a tenant-scoped table filters by tenantId
  const tenant = await db.tenant.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  })

  if (!tenant) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Organization not found in Wren. Ensure your Clerk org is registered.',
    })
  }

  // Resolve role from session claims or DB
  // Sprint 0: read role from DB; Sprint 2 will cache in Clerk session claims
  const tenantUser = await db.tenantUser.findUnique({
    where: {
      tenantId_clerkUserId: {
        tenantId: tenant.id,
        clerkUserId: userId,
      },
    },
    select: { role: true },
  })

  const role: UserRole = (tenantUser?.role as UserRole) ?? 'USER'

  // Attach to request — available in all downstream handlers
  // The FastifyRequest.auth type is augmented in @wren/types/src/auth.ts
  const authContext: AuthContext = {
    clerkUserId: userId,
    clerkOrgId: orgId,
    tenantId: tenant.id,
    role,
  }

  request.auth = authContext

  // Suppress unused variable warning — sessionClaims reserved for Sprint 2 role caching
  void sessionClaims
}
