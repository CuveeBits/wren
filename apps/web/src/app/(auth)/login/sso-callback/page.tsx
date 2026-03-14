'use client'

/**
 * Clerk SSO callback handler.
 * Required for OAuth (Google, GitHub, etc.) to complete the sign-in flow.
 */
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />
}
