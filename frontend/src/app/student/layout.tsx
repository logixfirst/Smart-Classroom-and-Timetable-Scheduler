'use client'

import { useEffect } from 'react'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.role.toLowerCase() !== 'student') {
        router.push('/unauthorized')
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GoogleSpinner size={48} />
      </div>
    )
  }

  if (!user || user.role.toLowerCase() !== 'student') {
    return null
  }

  return <>{children}</>
}
