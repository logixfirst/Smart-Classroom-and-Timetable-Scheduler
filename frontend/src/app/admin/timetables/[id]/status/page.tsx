/**
 * Real-Time Timetable Generation Status Page
 * 
 * Enterprise Pattern: Server-Sent Events + Velocity-Based Smooth Animation
 * 
 * ARCHITECTURAL COMPONENTS:
 * 1. SSE Connection (useProgress):
 *    - No polling (efficient bandwidth)
 *    - Real-time updates from Django API
 *    - Automatic reconnection with exponential backoff
 * 
 * 2. Velocity-Based Animation (useSmoothProgress):
 *    - Physics model: velocity + damping + acceleration
 *    - Monotonic constraint (never moves backward)
 *    - Clamps to authoritative backend progress
 *    - 60 FPS via requestAnimationFrame
 *    - No CSS transitions (JavaScript-controlled)
 * 
 * 3. Exponential ETA Smoothing (useSmoothedETA):
 *    - Prevents jarring jumps when backend recalculates
 *    - Alpha = 0.15 (moderate smoothing)
 *    - Separate from progress smoothing
 * 
 * 4. Continuous HSL Color Gradient (getProgressColor):
 *    - Sky blue (0%) → Deep navy (100%) — accessible, no red/green
 *    - No discrete color steps
 *    - Perceptually uniform
 * 
 * CRITICAL CONSTRAINTS:
 * - Backend progress is authoritative (source of truth)
 * - UI never exceeds backend progress
 * - UI never moves backward (monotonic)
 * - Animation runs even if backend stalls
 * - Final 100% uses special 600ms easing
 * 
 * WHY VELOCITY PHYSICS:
 * - Creates natural acceleration/deceleration
 * - Shows every integer percentage (40 → 41 → 42)
 * - Handles irregular backend updates gracefully
 * - Feels like car speedometer (intuitive UX)
 * 
 * PERFORMANCE:
 * - Isolated animation state in hooks
 * - No re-renders of parent component tree
 * - Production-safe (cancels on unmount)
 * - Works with updates every 1-5 seconds
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useProgress, useSmoothProgress, useSmoothedETA } from '@/hooks/useProgress'
import { fetchGenerationJobStatus } from '@/lib/api/timetable'
import type { GenerationJob } from '@/types/timetable'
import { useEffect, useRef, useState, ReactNode, useCallback } from 'react'
import { JetBrains_Mono } from 'next/font/google'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import { ArrowLeft, XCircle, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'] })

// ─── Stage configuration ──────────────────────────────────────────────────────
interface StageConfig {
  key: string
  label: string
  description: string
  icon: ReactNode
}

const STAGES: StageConfig[] = [
  {
    key: 'loading',
    label: 'Reading Data',
    description: 'Loading student and faculty information...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="status-stage-icon">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
        <path d="M4 5.5h8M4 8h8M4 10.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'clustering',
    label: 'Organising Courses',
    description: 'Grouping related subjects together...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="status-stage-icon">
        <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'cpsat_solving',
    label: 'Building Schedule',
    description: 'Assigning all courses to rooms and available time slots...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="status-stage-icon">
        <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" />
        <path d="M5.5 1v4M10.5 1v4M1.5 8h13" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'ga_optimization',
    label: 'Refining Timetable',
    description: 'Resolving conflicts and improving overall balance...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="status-stage-icon">
        <path d="M8 2l1.6 3.2 3.5.5-2.55 2.48.6 3.5L8 9.95 4.85 11.68l.6-3.5L2.9 5.7l3.5-.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'rl_refinement',
    label: 'Final Polish',
    description: 'Completing final checks and quality verification...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="status-stage-icon">
        <path d="M13 8A5 5 0 113 8" strokeLinecap="round" />
        <path d="M8 3V1M8 3l-1.5 1.5M8 3l1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStageOrder(stage: string): number {
  const order: Record<string, number> = {
    initializing: 0, loading: 1, clustering: 2,
    cpsat_solving: 3, ga_optimization: 4, rl_refinement: 5,
    completed: 6, failed: 6, cancelled: 6,
  }
  return order[stage] ?? 0
}

function formatETADisplay(seconds: number | null): string {
  if (seconds === null || seconds < 5) return 'Almost done...'
  if (seconds < 60) return `~${Math.round(seconds)} sec remaining`
  const mins = Math.ceil(seconds / 60)
  return `~${mins} min remaining`
}



export default function TimetableStatusPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [sseError, setSseError] = useState<string | null>(null)

  const { progress, isConnected, error, reconnectAttempt } = useProgress(
    jobId,
    () => { /* completion handled via useEffect on progress.status */ },
    (err) => {
      console.error('[Status] generation error:', err)
      setSseError(err)
    }
  )

  const smoothOverallProgress = useSmoothProgress(
    progress?.overall_progress ?? 0,
    { acceleration: 0.02, damping: 0.85, epsilon: 0.05, completionDuration: 600 }
  )

  // smoothStageProgress kept alive — hook must not be conditionally skipped
  useSmoothProgress(
    progress?.stage_progress ?? 0,
    { acceleration: 0.03, damping: 0.8, epsilon: 0.1, completionDuration: 400 }
  )

  const smoothETA = useSmoothedETA(progress?.eta_seconds ?? 0, 0.15)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // ── REST polling fallback (kicks in when SSE produces no data for 30 s) ──────
  const [sseTimedOut, setSseTimedOut] = useState(false)
  const [polledJob, setPolledJob] = useState<GenerationJob | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const pollFailCount = useRef(0)

  useEffect(() => {
    if (progress) { setSseTimedOut(false); return }
    const timer = setTimeout(() => setSseTimedOut(true), 30_000)
    return () => clearTimeout(timer)
  }, [progress])

  const pollOnce = useCallback(async (cancelled: { v: boolean }) => {
    try {
      const job = await fetchGenerationJobStatus(jobId)
      if (!cancelled.v) {
        setPolledJob(job)
        pollFailCount.current = 0
        setPollError(null)
      }
    } catch (err) {
      if (!cancelled.v) {
        pollFailCount.current += 1
        if (pollFailCount.current >= 3) {
          setPollError(err instanceof Error ? err.message : 'Unable to load job status')
        }
      }
    }
  }, [jobId])

  useEffect(() => {
    if (!sseTimedOut || progress) return
    const cancelled = { v: false }
    pollOnce(cancelled)
    const id = setInterval(() => pollOnce(cancelled), 5_000)
    return () => { cancelled.v = true; clearInterval(id) }
  }, [sseTimedOut, progress, pollOnce])

  // ── Success: warm caches, then redirect ────────────────────────────────────
  //
  // Strategy (Google SRE "cache-aside + preflight" pattern):
  //   1. Start warmup fetch for both Django cache endpoints immediately.
  //   2. Run a 3-second minimum display timer concurrently.
  //   3. Redirect when BOTH (a) 3 s elapsed AND (b) warmup responded.
  //   4. Cap warmup wait at WARMUP_TIMEOUT_MS so UX is never stuck.
  //
  // With the Celery pre-warm fix on the backend, warmup typically resolves
  // in < 500 ms (Redis cache hit), so effective redirect delay ≈ 3 s.
  // Without the fix (cold cache), warmup resolves in ≤ WARMUP_TIMEOUT_MS,
  // after which the review page fires its own fresh request and finds a
  // warmer (or warm by now) cache.
  useEffect(() => {
    if (progress?.status !== 'completed') return
    setCountdown(3)

    // Prefetch the review page bundle so Next.js has it ready to paint.
    router.prefetch(`/admin/timetables/${jobId}/review`)

    const API = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? 'http://localhost:8000'
    // Cap: so user is never held more than WARMUP_TIMEOUT_MS beyond the 3 s floor
    const WARMUP_TIMEOUT_MS = 8_000
    let didRedirect = false

    const warmupPromise = Promise.all([
      fetch(`${API}/api/timetable/workflows/${jobId}/`,       { credentials: 'include' }),
      fetch(`${API}/api/timetable/variants/?job_id=${jobId}`, { credentials: 'include' }),
    ]).catch(() => { /* best-effort; network errors are non-fatal */ })

    // Redirect gate: both the min-display floor AND cache warmup must pass.
    Promise.all([
      new Promise<void>(resolve => setTimeout(resolve, 3_000)),
      Promise.race([
        warmupPromise,
        new Promise<void>(resolve => setTimeout(resolve, WARMUP_TIMEOUT_MS)),
      ]),
    ]).then(() => {
      if (!didRedirect) {
        didRedirect = true
        router.push(`/admin/timetables/${jobId}/review`)
      }
    })

    // Countdown display is cosmetic only — redirect is controlled by the gate.
    const tick = setInterval(() => {
      setCountdown(c => (c > 1 ? c - 1 : 0))
    }, 1000)

    return () => {
      didRedirect = true
      clearInterval(tick)
    }
  }, [progress?.status, router, jobId])

  // ── Derived colour values — blue-deepening (accessible; no red/green) ─────────
  // hue 210→224, saturation 85→95%, lightness 75→38%  (sky blue → deep navy)
  const t           = smoothOverallProgress / 100
  const hue         = 210 + t * 14                           // 210 → 224
  const saturation  = 85  + t * 10                           // 85% → 95%
  const lightness   = 75  - t * 37                           // 75% → 38%
  const barColor    = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  const trackColor  = `hsl(210, 85%, 95%)`                   // fixed pale blue
  const shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`
  const GREEN       = 'hsl(224, 95%, 38%)'                   // deep navy for success
  const GREEN_TRACK = 'hsl(210, 85%, 95%)'                   // pale blue track

  // ── CSS-variable injection via DOM ref — avoids inline style props ──────────
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.style.setProperty('--bar-color',    barColor)
    el.style.setProperty('--track-color',  trackColor)
    el.style.setProperty('--shadow-color', shadowColor)
    el.style.setProperty('--progress-pct', `${smoothOverallProgress}%`)
  }, [barColor, trackColor, shadowColor, smoothOverallProgress])

  // ── Cancel handler ───────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_API_URL ?? 'http://localhost:8000'}/api/generation-jobs/${jobId}/cancel/`,
        { method: 'POST', credentials: 'include' }
      )
      router.push('/admin/timetables')
    } catch (e) {
      console.error('Failed to cancel:', e)
      setIsCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  // ── Connection error ─────────────────────────────────────────────────────────
  if (error && reconnectAttempt > 5) {
    return (
      <div className="status-page-bg">
        <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
            <ArrowLeft size={15} />
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-danger-subtle)]">
            <XCircle size={32} className="text-[var(--color-danger)]" />
          </div>
          <h2 className="text-[22px] font-bold mb-3 text-[var(--color-text-primary)]">
            Connection Lost
          </h2>
          <p className="text-[15px] mb-8 max-w-xs mx-auto text-[var(--color-text-secondary)]">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
            <button onClick={() => router.push('/admin/timetables')} className="btn-secondary">
              Back to Timetables
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SSE fatal error (fired onError after all reconnect attempts) ────────────
  if (sseError && reconnectAttempt > 3 && !progress) {
    return (
      <div className="status-page-bg">
        <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
            <ArrowLeft size={15} />
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-danger-subtle)]">
            <XCircle size={32} className="text-[var(--color-danger)]" />
          </div>
          <h2 className="text-[22px] font-bold mb-3 text-[var(--color-text-primary)]">
            Generation Failed
          </h2>
          <p className="text-[15px] mb-8 max-w-sm mx-auto text-[var(--color-text-secondary)]">{sseError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/admin/timetables/new')} className="btn-primary">
              Try Again
            </button>
            <button onClick={() => router.push('/admin/timetables')} className="btn-secondary">
              Back to Timetables
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── REST polling reached terminal state while SSE is down ───────────────────
  if (!progress && polledJob) {
    if (polledJob.status === 'failed') {
      return (
        <div className="status-page-bg">
          <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
            <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
              <ArrowLeft size={15} />
              Back to Timetables
            </button>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-danger-subtle)]">
              <XCircle size={32} className="text-[var(--color-danger)]" />
            </div>
            <h2 className="text-[26px] font-bold mb-3 text-[var(--color-text-primary)]">
              Generation Failed
            </h2>
            <p className="text-[15px] mb-8 max-w-sm mx-auto text-[var(--color-text-secondary)]">
              {polledJob.error_message ?? 'Something went wrong while building the timetable. Please try again.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/admin/timetables/new')} className="btn-primary">Try Again</button>
              <button onClick={() => router.push('/admin/timetables')} className="btn-secondary">Back to Timetables</button>
            </div>
          </div>
        </div>
      )
    }
    if (polledJob.status === 'cancelled') {
      return (
        <div className="status-page-bg">
          <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
            <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
              <ArrowLeft size={15} />
              Back to Timetables
            </button>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-warning-subtle)]">
              <AlertTriangle size={32} className="text-[var(--color-warning)]" />
            </div>
            <h2 className="text-[26px] font-bold mb-3 text-[var(--color-text-primary)]">
              Generation Cancelled
            </h2>
            <p className="text-[15px] mb-8 text-[var(--color-text-secondary)]">The timetable generation was stopped.</p>
            <button onClick={() => router.push('/admin/timetables')} className="btn-primary">Back to Timetables</button>
          </div>
        </div>
      )
    }
    if (polledJob.status === 'completed') {
      router.push(`/admin/timetables/${jobId}/review`)
      return null
    }
  }

  // ── REST polling consistently failed (≥ 3 errors, SSE also has no data) ────
  if (pollError && !progress) {
    return (
      <div className="status-page-bg">
        <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
            <ArrowLeft size={15} />
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-danger-subtle)]">
            <XCircle size={32} className="text-[var(--color-danger)]" />
          </div>
          <h2 className="text-[22px] font-bold mb-3 text-[var(--color-text-primary)]">
            Unable to Load Status
          </h2>
          <p className="text-[15px] mb-8 max-w-xs mx-auto text-[var(--color-text-secondary)]">{pollError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
            <button onClick={() => router.push('/admin/timetables')} className="btn-secondary">Back to Timetables</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Connecting / loading ─────────────────────────────────────────────────────
  if (!progress) {
    return (
      <div className="status-page-bg">
        <div className="status-center-fade">
          <GoogleSpinner size={48} className="mx-auto mb-6" />
          <p className="font-semibold text-[17px] mb-1 text-[var(--color-text-primary)]">
            {reconnectAttempt > 0 ? 'Reconnecting...' : 'Connecting...'}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {reconnectAttempt > 0 ? `Attempt ${reconnectAttempt} of 5` : 'Please wait a moment'}
          </p>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (progress.status === 'completed') {
    return (
      <div className="status-page-bg">
        <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-4">
            <ArrowLeft size={15} />
            Back to Timetables
          </button>
          <svg className="mx-auto mb-8" width="96" height="96" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="25" fill={GREEN_TRACK} stroke={GREEN} strokeWidth="1.5" />
            <path
              d="M14 27l8 8 16-16"
              fill="none" stroke={GREEN} strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              className="status-check-path"
            />
          </svg>
          <h2 className="text-[26px] font-bold mb-3 text-[var(--color-text-primary)]">
            Timetable Ready
          </h2>
          <p className="text-[15px] mb-8 text-[var(--color-text-secondary)]">
            {countdown > 0
              ? `Preparing timetable data\u2026 ${countdown}`
              : 'Opening review page\u2026'}
          </p>
          <div className="w-full mb-8 status-complete-track">
            <div className="status-complete-fill" />
          </div>
          <button
            onClick={() => router.push(`/admin/timetables/${jobId}/review`)}
            className="btn-primary"
          >
            View Timetables
          </button>
        </div>
      </div>
    )
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  if (progress.status === 'failed') {
    const errorMsg = progress.metadata?.error != null
      ? String(progress.metadata.error)
      : 'Something went wrong while building the timetable. Please try again.'
    return (
      <div className="status-page-bg">
        <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
            <ArrowLeft size={15} />
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-danger-subtle)]">
            <XCircle size={32} className="text-[var(--color-danger)]" />
          </div>
          <h2 className="text-[26px] font-bold mb-3 text-[var(--color-text-primary)]">
            Generation Failed
          </h2>
          <p className="text-[15px] mb-8 max-w-sm mx-auto text-[var(--color-text-secondary)]">{errorMsg}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/admin/timetables/new')} className="btn-primary">
              Try Again
            </button>
            <button onClick={() => router.push('/admin/timetables')} className="btn-secondary">
              Back to Timetables
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Cancelled ────────────────────────────────────────────────────────────────
  if (progress.status === 'cancelled') {
    return (
      <div className="status-page-bg">
        <div className="max-w-[680px] w-full text-center status-modal-card status-modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="btn-text flex items-center gap-1.5 mb-6">
            <ArrowLeft size={15} />
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-warning-subtle)]">
            <AlertTriangle size={32} className="text-[var(--color-warning)]" />
          </div>
          <h2 className="text-[26px] font-bold mb-3 text-[var(--color-text-primary)]">
            Generation Cancelled
          </h2>
          <p className="text-[15px] mb-8 text-[var(--color-text-secondary)]">The timetable generation was stopped.</p>
          <button onClick={() => router.push('/admin/timetables')} className="btn-primary">
            Back to Timetables
          </button>
        </div>
      </div>
    )
  }

  // ── Active progress ──────────────────────────────────────────────────────────
  const currentStageOrder = getStageOrder(progress.stage ?? 'loading')
  const activeStage = STAGES.find(s => s.key === progress.stage) ?? STAGES[0]

  const semesterNum  = progress.metadata?.semester  as string | number | undefined
  const academicYear = progress.metadata?.academic_year as string | undefined
  const subtitle = semesterNum && academicYear
    ? `Semester ${semesterNum} · ${academicYear}`
    : 'Timetable Generation in Progress'

  return (
    <div ref={containerRef} className="space-y-5 pb-10">
      <PageHeader
        title="Generation Status"
        parentLabel="Timetables"
        parentHref="/admin/timetables"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="card xl:col-span-2 status-modal-card--in1">
          <p className="text-[11px] font-medium uppercase tracking-widest mb-2 text-[var(--color-text-muted)]">
            Banaras Hindu University
          </p>

          <h2 className="text-[24px] font-bold mb-1 text-[var(--color-text-primary)]">
            Building Your Timetable
          </h2>

          <p className="text-[15px] mb-5 text-[var(--color-text-secondary)]">
            {subtitle}
          </p>

          <div className="text-right mb-2">
            <span
              key={Math.floor(smoothOverallProgress)}
              className={`${jetbrainsMono.className} status-pct-display`}
            >
              {smoothOverallProgress.toFixed(1)}%
            </span>
          </div>

          <div>
            <div className="relative w-full status-progress-track">
              <div className="status-progress-fill" />
              <div className="status-shimmer-overlay status-progress-shimmer-fill" />
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between gap-6">
            <p className="text-xs italic leading-snug text-[var(--color-text-secondary)]">
              {activeStage.description}
            </p>
            <p className="text-sm whitespace-nowrap shrink-0 text-[var(--color-text-secondary)]">
              {formatETADisplay(smoothETA)}
            </p>
          </div>

          <div className="mt-6 mb-1">
            <div className="relative flex items-start">
              {STAGES.map((stage, i) => {
                const stageOrder = getStageOrder(stage.key)
                const isCompleted = currentStageOrder > stageOrder
                const isActive = progress.stage === stage.key
                const isDone = isCompleted || isActive

                return (
                  <div key={stage.key} className="flex items-start flex-1 last:flex-none">
                    <div className="flex flex-col items-center min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${isDone ? 'status-stage-node-fill' : 'status-stage-node-idle'}${isActive ? ' status-stage-node-pulse' : ''}`}
                      >
                        {isCompleted ? (
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" className="status-small-icon">
                            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          stage.icon
                        )}
                      </div>
                      <span className={`mt-2 text-center leading-tight ${isDone ? 'status-stage-label-active' : 'status-stage-label-idle'}`}>
                        {stage.label}
                      </span>
                    </div>

                    {i < STAGES.length - 1 && (
                      <div className={`flex-1 self-start mt-4 mx-1 ${isCompleted ? 'status-connector-filled' : 'status-connector-dashed'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card status-modal-card--in">
          <h3 className="card-title mb-1">Job Health</h3>
          <p className="card-description mb-4">Status signal and operator action for this generation run</p>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Current Stage</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{activeStage.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Connection</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'status-dot-live' : reconnectAttempt > 0 ? 'status-dot-warn' : 'status-dot-err'}`}
                />
                <span className="text-sm text-[var(--color-text-primary)]">
                  {isConnected ? 'Live' : reconnectAttempt > 0 ? 'Reconnecting...' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              Use cancel only when you need to stop this run immediately.
            </p>
            {!showCancelConfirm ? (
              <button onClick={() => setShowCancelConfirm(true)} className="btn-delete w-full justify-center">
                Cancel Generation
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleCancel} disabled={isCancelling} className="btn-danger flex-1 justify-center">
                    {isCancelling ? 'Stopping...' : 'Yes, stop'}
                  </button>
                  <button onClick={() => setShowCancelConfirm(false)} className="btn-ghost flex-1 justify-center">
                    Keep going
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
