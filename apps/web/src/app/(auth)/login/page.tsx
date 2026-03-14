/**
 * Login page — renders Clerk's pre-built SignIn component.
 * Clerk handles all auth flows: email/password, OAuth, MFA, SAML (ADR-010).
 */
import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
          },
        }}
      />
    </main>
  )
}
