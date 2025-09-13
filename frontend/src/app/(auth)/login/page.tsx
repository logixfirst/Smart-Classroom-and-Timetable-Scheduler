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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f9f9f9] dark:bg-[#212121]">
      <div className="card w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1a73e8] dark:bg-[#FF0000] rounded-xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-sm">
              S
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">SIH28</h1>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Welcome Back</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="p-3 sm:p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input 
              id="username" 
              type="text" 
              placeholder="Try: admin, staff, faculty, or student"
              className="input-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input 
              id="password" 
              type="password" 
              placeholder="Any password"
              className="input-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary btn-primary-light dark:btn-primary-dark w-full py-3 sm:py-4 text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Mock Auth: Use "admin", "staff", "faculty", or "student" as username
          </p>
        </div>
      </div>
    </div>
  )
}