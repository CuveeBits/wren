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

  if (orgSlug) {
    redirect(`/dashboard/${orgSlug}`)
  }

  // User is authenticated but has no org — they need to create/join one
  redirect('/login')
}
