/**
 * Dashboard layout — wraps all authenticated tenant-scoped pages.
 *
 * White-label (ADR-015): applies tenant's primaryColor CSS variable if configured.
 * Falls back to Wren defaults.
 *
 * In production, tenant config would be fetched from the API here.
 * Sprint 0: uses placeholder data for the scaffold.
 */
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/shell'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  const { tenantSlug } = await params

  return (
    <DashboardShell tenantSlug={tenantSlug}>
      {children}
    </DashboardShell>
  )
}
