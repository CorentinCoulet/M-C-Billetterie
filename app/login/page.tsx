'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthPage } from '../../src/components/AuthPage'
import { Background } from '../../src/components/common/Background'

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  const navigate = (page: string) => {
    switch (page) {
      case 'home':
        router.push('/')
        break
      case 'events':
        router.push('/events')
        break
      case 'profile':
        router.push('/profile')
        break
      default:
        router.push(`/${page}`)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    router.push('/')
  }

  return (
    <div className="min-h-screen">
      <Background />
      <AuthPage 
        navigate={navigate}
        currentUser={currentUser}
        users={users}
        setUsers={setUsers}
        setCurrentUser={setCurrentUser}
        logout={logout}
      />
    </div>
  )
}
