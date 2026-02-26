'use client'

import { useEffect } from 'react'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import DashboardLayout from '@/components/dashboard-layout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else {
        const role = user.role.toLowerCase()
        if (role !== 'admin' && role !== 'org_admin' && role !== 'super_admin') {
          router.push('/unauthorized')
        }
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] dark:bg-[#212121]">
        <GoogleSpinner size={48} />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const role = user.role.toLowerCase()
  if (role !== 'admin' && role !== 'org_admin' && role !== 'super_admin') {
    return null
  }

  return <DashboardLayout role="admin">{children}</DashboardLayout>
}
