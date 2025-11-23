import { Suspense } from 'react'

// Force this page to be dynamic to avoid prerender errors when using client-side navigation hooks
export const dynamic = 'force-dynamic'

// Keep the page as a Server Component that only renders a Suspense boundary
// The actual logic that uses client hooks lives in LoginClient below
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      {/* Client-only content wrapped in Suspense to satisfy Next.js requirement */}
      <LoginClient />
    </Suspense>
  )
}
