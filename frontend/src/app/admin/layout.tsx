'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.role !== 'admin') {
        router.push('/unauthorized')
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] dark:bg-[#212121]">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return <>{children}</>
}
