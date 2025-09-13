"use client"

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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 lg:p-10 w-full max-w-md text-center hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
        <div className="mb-6 lg:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
            <span className="text-2xl sm:text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            Access Denied
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            You don't have permission to access this page.
          </p>
        </div>
        
        <button onClick={handleLogout} className="w-full py-3 sm:py-4 text-sm sm:text-base font-bold text-white bg-indigo-600/80 hover:bg-indigo-600 backdrop-blur-sm border border-indigo-500/50 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500">
          Back to Login
        </button>
      </div>
    </div>
  )
}