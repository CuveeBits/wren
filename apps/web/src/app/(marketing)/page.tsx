/**
 * Marketing / landing page.
 * Public route — no auth required.
 * Sprint 0: simple placeholder. Full marketing page ships separately.
 */
import Link from 'next/link'

export default function MarketingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">
          Wren
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          AI-powered business automation for SMBs. Automate workflows, build agents, and boost productivity.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/register"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  )
}
