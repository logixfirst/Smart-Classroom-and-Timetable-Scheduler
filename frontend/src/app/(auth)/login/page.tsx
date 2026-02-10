'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { FormField } from '@/components/FormFields'
import { useToast } from '@/components/Toast'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    try {
      await login(data.username, data.password)
      showToast('success', 'Login successful! Redirecting...')

      // Get user data from localStorage to check role
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)

        // Redirect based on user role (case-insensitive)
        const role = user.role.toLowerCase()
        switch (role) {
          case 'admin':
          case 'org_admin':
            router.push('/admin/dashboard')
            break
          case 'student':
            router.push('/student/dashboard')
            break
          case 'faculty':
            router.push('/faculty/dashboard')
            break
          default:
            router.push('/admin/dashboard') // Default to admin for now
        }
      } else {
        // Fallback to username-based redirect if role not available
        if (data.username.includes('admin')) {
          router.push('/admin/dashboard')
        } else if (data.username.includes('student')) {
          router.push('/student/dashboard')
        } else {
          router.push('/faculty/dashboard')
        }
      }
    } catch (err) {
      showToast('error', 'Login failed. Please check your credentials and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f9f9f9] dark:bg-[#212121]">
      <div className="card w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1a73e8] dark:bg-[#1a73e8] rounded-xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-sm">
              S
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
              SIH28
            </h1>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Welcome Back
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <FormField
            name="username"
            label="Username or Email"
            type="text"
            placeholder="Enter username or email"
            register={register}
            error={errors.username}
            required
          />

          <div className="relative">
            <FormField
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              register={register}
              error={errors.password}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 sm:py-4 text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
