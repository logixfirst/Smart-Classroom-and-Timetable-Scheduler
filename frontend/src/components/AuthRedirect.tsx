'use client'

/**
 * Drop this component into any page that authenticated users should NOT see
 * (marketing landing, login). It silently redirects them to their dashboard.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export function AuthRedirect() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return          // wait for the auth check to finish
    if (!user) return              // not logged in — stay on this page

    const role = user.role?.toLowerCase() ?? ''
    if (role === 'admin' || role === 'org_admin') {
      router.replace('/admin/dashboard')
    } else if (role === 'faculty') {
      router.replace('/faculty/dashboard')
    } else if (role === 'student') {
      router.replace('/student/dashboard')
    }
  }, [user, isLoading, router])

  return null  // renders nothing
}
