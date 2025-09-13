"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, password)
      // Redirect based on role after login
      if (username.includes('admin')) {
        router.push('/admin/dashboard')
      } else if (username.includes('staff')) {
        router.push('/staff/dashboard')
      } else if (username.includes('student')) {
        router.push('/student/dashboard')
      } else {
        router.push('/faculty/dashboard')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 lg:p-10 w-full max-w-sm sm:max-w-md hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
        <div className="text-center mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600/80 backdrop-blur-sm border border-indigo-500/50 rounded-2xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg shadow-indigo-500/25">
              S
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">SIH28</h1>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-3xl font-bold mb-2 text-white">Welcome Back</h2>
          <p className="text-sm sm:text-base text-slate-300">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="p-3 sm:p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-300 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username" className="block text-sm sm:text-base font-semibold text-white mb-2">
              Username
            </label>
            <input 
              id="username" 
              type="text" 
              placeholder="Try: admin, staff, faculty, or student"
              className="w-full px-4 py-3 text-sm sm:text-base border border-slate-700 rounded-xl bg-slate-900/50 backdrop-blur-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-white mb-2">
              Password
            </label>
            <input 
              id="password" 
              type="password" 
              placeholder="Any password"
              className="w-full px-4 py-3 text-sm sm:text-base border border-slate-700 rounded-xl bg-slate-900/50 backdrop-blur-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full py-3 sm:py-4 text-sm sm:text-base font-bold text-white bg-indigo-600/80 hover:bg-indigo-600 backdrop-blur-sm border border-indigo-500/50 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-600/50">
          <p className="text-center text-xs sm:text-sm text-slate-400 leading-relaxed">
            Mock Auth: Use "admin", "staff", "faculty", or "student" as username
          </p>
        </div>
      </div>
    </div>
  )
}