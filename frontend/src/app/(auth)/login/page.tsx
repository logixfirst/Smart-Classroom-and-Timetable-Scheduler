'use client'

import { useState, forwardRef, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'

// ─── Crawl speed curve (mirrors NavigationProgress) ──────────────────────────
function crawlStep(w: number): number {
  if (w <  30) return 8   + Math.random() * 4
  if (w <  50) return 5   + Math.random() * 3
  if (w <  65) return 3   + Math.random() * 2
  if (w <  75) return 1.5 + Math.random() * 1.5
  if (w <  82) return 0.8 + Math.random() * 0.8
  if (w <  87) return 0.4 + Math.random() * 0.4
  return 0.15 + Math.random() * 0.15
}

// ─── Hook: imperative in-card progress bar ────────────────────────────────────
function useCardProgress() {
  const barRef    = useRef<HTMLDivElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef   = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const widthRef  = useRef(0)
  const activeRef = useRef(false)

  const setW = useCallback((w: number) => {
    widthRef.current = w
    if (barRef.current) barRef.current.style.width = `${w}%`
  }, [])

  const setOp = useCallback((op: number, ms = 0) => {
    const el = wrapRef.current
    if (!el) return
    el.style.transition = ms ? `opacity ${ms}ms ease` : 'none'
    el.style.opacity    = String(op)
  }, [])

  const stop = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (hideRef.current) { clearTimeout(hideRef.current);  hideRef.current = null }
  }, [])

  const start = useCallback(() => {
    stop()
    activeRef.current = true
    if (barRef.current) barRef.current.style.transition = 'none'
    setOp(1)
    setW(0)

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!barRef.current) return
      barRef.current.style.transition = 'width 120ms ease-out'
      setW(20)
      setTimeout(() => {
        if (!activeRef.current) return
        tickRef.current = setInterval(() => {
          const next = Math.min(widthRef.current + crawlStep(widthRef.current), 90)
          if (barRef.current) barRef.current.style.transition = 'width 180ms ease-out'
          setW(next)
        }, 200)
      }, 140)
    }))
  }, [stop, setOp, setW])

  const finish = useCallback(() => {
    stop()
    activeRef.current = false
    if (barRef.current) barRef.current.style.transition = 'width 200ms cubic-bezier(0.4,0,0.2,1)'
    setW(100)
    hideRef.current = setTimeout(() => {
      setOp(0, 400)
      setTimeout(() => {
        if (barRef.current) barRef.current.style.transition = 'none'
        setW(0)
      }, 450)
    }, 180)
  }, [stop, setOp, setW])

  const reset = useCallback(() => {
    stop()
    activeRef.current = false
    if (barRef.current) barRef.current.style.transition = 'none'
    setOp(0, 300)
    setTimeout(() => setW(0), 350)
  }, [stop, setOp, setW])

  /** The bar element — place inside the card with position:relative + overflow:hidden */
  const BarElement = (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        right:         0,
        height:        '4px',
        opacity:       0,
        pointerEvents: 'none',
        willChange:    'opacity',
        borderRadius:  '28px 28px 0 0',
        overflow:      'hidden',
      }}
    >
      <div
        ref={barRef}
        style={{
          height:     '100%',
          width:      '0%',
          background: '#4285f4',
          willChange: 'width',
        }}
      />
    </div>
  )

  return { start, finish, reset, BarElement }
}

// ─── Inline eye icons (no extra file) ────────────────────────────────────────
function EyeOpen() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

// ─── Google Material outlined input ──────────────────────────────────────────
// Must be a forwardRef component so react-hook-form's `register` ref reaches
// the underlying <input> DOM node — without this, RHF can't read field values,
// causing "required" errors on every submit and the form never firing onSubmit.
type OutlinedInputProps = {
  id: string
  label: string
  type: string
  placeholder?: string
  error?: string
  suffix?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>

const OutlinedInput = forwardRef<HTMLInputElement, OutlinedInputProps>(
  function OutlinedInput({ id, label, type, placeholder, error, suffix, ...rest }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[14px] font-medium text-[#444746] dark:text-[#bdc1c6]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder ?? ''}
          className={[
            'w-full h-14 px-4 rounded-[4px] text-[16px] outline-none',
            'bg-transparent',
            'text-[#202124] dark:text-[#e8eaed]',
            'placeholder:text-[#9aa0a6]',
            'border transition-colors duration-150',
            suffix ? 'pr-12' : '',
            error
              ? 'border-[#b3261e] dark:border-[#f2b8b5] focus:border-[#b3261e] dark:focus:border-[#f2b8b5] focus:ring-1 focus:ring-[#b3261e]'
              : 'border-[#747775] dark:border-[#8e918f] focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#1a73e8] dark:focus:ring-[#8ab4f8]',
          ].join(' ')}
          {...rest}
          onAnimationStart={(e) => {
            // Chromium fires a CSS animationstart named 'onAutoFillStart' when
            // autofilling. Dispatch synthetic events so RHF reads the value.
            const animName = (e.animationName ?? '') as string
            if (animName.toLowerCase().includes('autofill')) {
              const target = e.currentTarget
              target.dispatchEvent(new Event('input',  { bubbles: true }))
              target.dispatchEvent(new Event('change', { bubbles: true }))
            }
            rest.onAnimationStart?.(e)
          }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] dark:text-[#9aa0a6]">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-[12px] text-[#b3261e] dark:text-[#f2b8b5] flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
})

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
              width={40}
              height={40}
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
