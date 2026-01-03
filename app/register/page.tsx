import { Suspense } from 'react'
import LoginClient from '../login/LoginClient'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      {/* Render AuthPage with register tab by default via LoginClient props */}
      <LoginClient initialTab="register" />
    </Suspense>
  )
}
