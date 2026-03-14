/**
 * Register page — renders Clerk's pre-built SignUp component.
 * After sign-up, Clerk redirects to /dashboard (via NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL).
 */
import { SignUp } from '@clerk/nextjs'

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
          },
        }}
      />
    </main>
  )
}
