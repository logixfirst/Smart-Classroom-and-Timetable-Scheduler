'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f9f9f9] dark:bg-[#212121]">
      <div className="card w-full max-w-md text-center">
        <div className="mb-6 lg:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl sm:text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-gray-800 dark:text-gray-200 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            You don't have permission to access this page.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="btn-primary btn-primary-light dark:btn-primary-dark w-full py-3 sm:py-4 text-sm sm:text-base font-semibold"
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}
