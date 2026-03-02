'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { useCardProgress } from '@/hooks/useCardProgress'
import { OutlinedInput } from '@/components/ui/OutlinedInput'
import { EyeOpen, EyeOff } from '@/components/ui/PasswordToggleIcons'



export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const { login, user } = useAuth()
  const router = useRouter()
  const { start, finish, reset, BarElement } = useCardProgress()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const ROLE_DASHBOARD: Record<string, string> = {
    admin:     '/admin/dashboard',
    org_admin: '/admin/dashboard',
    faculty:   '/faculty/dashboard',
    student:   '/student/dashboard',
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setLoginError(null)
    start()
    try {
      await login(data.username, data.password)
      finish()
      const raw = localStorage.getItem('user')
      const role = raw ? (JSON.parse(raw).role?.toLowerCase() ?? '') : ''
      router.push(ROLE_DASHBOARD[role] ?? '/admin/dashboard')
    } catch {
      reset()
      setLoginError('Wrong username or password. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // If user is authenticated (set synchronously from localStorage or after
  // background verification), redirect immediately — no blank screen, no flash.
  if (user) {
    const role = user.role?.toLowerCase() ?? ''
    const ROLE_DASHBOARD: Record<string, string> = {
      admin:     '/admin/dashboard',
      org_admin: '/admin/dashboard',
      faculty:   '/faculty/dashboard',
      student:   '/student/dashboard',
    }
    router.replace(ROLE_DASHBOARD[role] ?? '/admin/dashboard')
    return null
  }

  return (
    <>
      {/* ── Page shell — Google #f0f4f9 background ── */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[#f0f4f9] dark:bg-[#111111]">

        {/* ── Card — Google Material 3: white, 28px radius, hairline border ── */}
        <div className="relative w-full max-w-[450px] bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] rounded-[28px] px-10 py-10 sm:px-12 overflow-hidden">

          {/* ── In-card progress bar (Google-style, top of card) ── */}
          {BarElement}

          {/* ── Header ── */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <Image
              src="/logo2.png"
              alt="Cadence"
              width={72}
              height={72}
              priority
              quality={100}
              className="rounded-full object-contain"
            />
            <h1 className="text-[24px] font-normal text-[#202124] dark:text-[#e8eaed] mt-1">
              Sign in
            </h1>
            <p className="text-[14px] text-[#5f6368] dark:text-[#9aa0a6]">
              to continue to Cadence
            </p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* Google-style: dim + block interaction on the whole form while loading */}
            <div
              className="flex flex-col gap-5"
              style={{
                opacity:       isLoading ? 0.45 : 1,
                pointerEvents: isLoading ? 'none' : 'auto',
                transition:    'opacity 150ms ease',
              }}
            >

            <OutlinedInput
              id="username"
              label="Username or email"
              type="text"
              autoComplete="username"
              placeholder=""
              disabled={isLoading}
              error={errors.username?.message}
              {...register('username')}
            />

            <OutlinedInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder=""
              disabled={isLoading}
              error={errors.password?.message}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors disabled:pointer-events-none"
                >
                  {showPassword ? <EyeOff /> : <EyeOpen />}
                </button>
              }
              {...register('password')}
            />

            </div>

            {/* Forgot link — Google right-aligns it */}
            <div className="flex justify-end -mt-2">
              <a
                href="#"
                className="text-[14px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* ── Inline error (Google-style: red text under fields) ── */}
            {loginError && (
              <p className="text-[13px] text-[#b3261e] dark:text-[#f2b8b5] flex items-center gap-1.5 -mt-1">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {loginError}
              </p>
            )}

            {/* ── Bottom row: Create account (left) + Sign in (right) ── */}
            <div className="flex items-center justify-between mt-1">
              <a
                href="#"
                className="text-[14px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
              >
                Create account
              </a>
              <button
                type="submit"
                disabled={isLoading}
                className="h-[40px] px-7 rounded-full bg-[#1a73e8] hover:bg-[#1765cc] active:bg-[#185abc] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[15px] font-medium transition-colors duration-150"
              >
                Sign in
              </button>
            </div>

          </form>
        </div>

        {/* ── Footer ── */}
        <p className="text-[12px] text-[#5f6368] dark:text-[#9aa0a6] mt-8">
          &copy; {new Date().getFullYear()} Cadence Platform
        </p>
      </div>
    </>
  )
}
