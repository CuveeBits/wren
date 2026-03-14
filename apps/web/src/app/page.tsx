/**
 * Home page — redirects based on auth state.
 * Authenticated users with an org go to their dashboard.
 * Unauthenticated users go to /login.
 */
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId, orgSlug } = await auth()

  if (!userId) {
    redirect('/login')
  }

  // Use org slug if available, otherwise fall back to 'demo' tenant
  // Note: (dashboard) is a Next.js route group — URLs are /[tenantSlug], NOT /dashboard/[tenantSlug]
  redirect(`/${orgSlug ?? 'demo'}`)
}
