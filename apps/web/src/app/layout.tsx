/**
 * Root layout — wraps every page with Clerk auth provider and theme provider.
 *
 * White-label (ADR-015): CSS variables are set at the tenant layout level
 * (apps/web/src/app/(dashboard)/[tenantSlug]/layout.tsx) so they override these defaults.
 */
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wren — AI Platform for SMBs',
  description: 'Your AI-powered business assistant. Automate workflows and boost productivity.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
