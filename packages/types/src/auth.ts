/**
 * Auth types shared between web and API.
 * Clerk → Wren auth context mapping.
 */

// Import from fastify to enable module augmentation below
import type {} from 'fastify'

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'DEPT_ADMIN' | 'USER'

export interface AuthContext {
  clerkUserId: string
  tenantId: string
  clerkOrgId: string
  role: UserRole
}

// Fastify type augmentation — allows request.auth in route handlers
declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext
  }
}
