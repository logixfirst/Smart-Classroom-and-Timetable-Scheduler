'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { FormField } from '@/components/FormFields'
import { useToast } from '@/components/Toast'
import { Divider } from '@/components/ui/Divider'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 sm:p-6"
      style={{ background: 'var(--color-bg-page)' }}
    >
      {/* Card — invisible on mobile, visible sm+ */}
      <div
        className="w-full"
        style={{ maxWidth: '400px' }}
      >
        <div
          className="w-full"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-modal)',
            padding: 'clamp(24px, 5vw, 40px)',
          }}
        >
          {/* Logo + brand */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="flex items-center gap-3">
              {/* Grid-of-squares SVG logo */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-label="SIH28 logo"
              >
                <rect x="2"  y="2"  width="12" height="12" rx="2.5" fill="var(--color-primary)" />
                <rect x="18" y="2"  width="12" height="12" rx="2.5" fill="var(--color-primary)" opacity="0.75" />
                <rect x="2"  y="18" width="12" height="12" rx="2.5" fill="var(--color-primary)" opacity="0.75" />
                <rect x="18" y="18" width="12" height="12" rx="2.5" fill="var(--color-primary)" opacity="0.5" />
              </svg>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '22px',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                }}
              >
                SIH28
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Timetable Optimization Platform
            </p>
          </div>

          <Divider spacing="md" />

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" style={{ marginTop: '20px' }}>
            <div>
              <label
                htmlFor="username"
                style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px' }}
              >
                Username or Email
              </label>
              <FormField
                name="username"
                label=""
                type="text"
                placeholder="Enter username or email"
                register={register}
                error={errors.username}
                required
              />
              {errors.username && (
                <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px' }}
              >
                Password
              </label>
              <div className="relative">
                <FormField
                  name="password"
                  label=""
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  register={register}
                  error={errors.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
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
              {errors.password && (
                <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              style={{
                height: 'clamp(40px, 5vw, 48px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
              }}
              disabled={isLoading}
            >
              {isLoading && <GoogleSpinner size={18} />}
              Sign In
            </button>
          </form>
        </div>

        {/* Footer outside card */}
        <p
          className="text-center"
          style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '24px' }}
        >
          &copy; {new Date().getFullYear()} SIH28 Platform
        </p>
      </div>
    </div>
  )
}
