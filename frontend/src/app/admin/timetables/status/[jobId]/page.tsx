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
import { useEffect, useRef, useState, ReactNode } from 'react'
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

const dmSerifDisplay = DM_Serif_Display({ subsets: ['latin'], weight: '400' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'] })

// ─── CSS Keyframes + Static Utility Classes ──────────────────────────────────
const CSS_KEYFRAMES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes nodePulse {
  0%, 100% { transform: scale(1);    }
  50%       { transform: scale(1.12); }
}
@keyframes scalePop {
  0%   { transform: scale(1);    }
  50%  { transform: scale(1.04); }
  100% { transform: scale(1);    }
}
@keyframes drawCheck {
  to { stroke-dashoffset: 0; }
}
.shimmer-overlay {
  background: linear-gradient(
    90deg,
    transparent              0%,
    rgba(255,255,255,0.45)  35%,
    rgba(255,255,255,0.75)  50%,
    rgba(255,255,255,0.45)  65%,
    transparent             100%
  );
  animation: shimmer 1.8s linear infinite;
}
/* Dot-grid page background — fills AppShell content pane, no scroll override */
.page-bg {
  min-height: calc(100vh - 4.5rem);
  background: var(--color-bg-page);
  background-image: radial-gradient(circle, #CBD5E1 1px, transparent 1px);
  background-size: 24px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
  border-radius: inherit;
}
/* Shared modal card */
.modal-card { box-shadow: 0 4px 24px rgba(15,23,42,0.06); padding: 28px 36px; z-index: 1; }
.modal-card--in  { animation: fadeUp 400ms ease-out both; }
.modal-card--in1 { animation: fadeUp 400ms ease-out 100ms both; }
/* Top gradient overlay */
.top-gradient { background: linear-gradient(to bottom, rgba(248,250,255,0.95), transparent); z-index: 0; }
/* SVG icon sizes */
.stage-icon { width: 14px; height: 14px; }
.small-icon { width: 12px; height: 12px; }
/* Connecting screen centre */
.center-fade { text-align: center; animation: fadeUp 400ms ease-out 100ms both; }
/* Checkmark SVG path draw-on animation */
.check-path { stroke-dasharray: 44; stroke-dashoffset: 44; animation: drawCheck 600ms ease-in-out forwards; }
/* Success bar (always 100% deep blue) */
.complete-track { height: 14px; background-color: hsl(120,80%,94%); }
.complete-fill  { height: 100%; border-radius: 9999px; background-color: hsl(120,88%,48%); }
/* Dynamic progress bar — driven by CSS custom properties */
.progress-track { height: 14px; background-color: var(--track-color, #E2E8F0); }
.progress-fill {
  height: 100%; position: absolute; top: 0; left: 0;
  border-radius: 9999px;
  background-color: var(--bar-color, #2563EB);
  box-shadow: 0 2px 8px var(--shadow-color, transparent);
  width: var(--progress-pct, 0%);
  transition: none;
}
.progress-shimmer-fill {
  height: 100%; position: absolute; top: 0; left: 0;
  border-radius: 9999px;
  width: var(--progress-pct, 0%);
  transition: none;
}
/* Percentage counter */
.pct-display {
  font-size: 2.5rem; font-weight: 700;
  color: var(--bar-color, #2563EB);
  display: inline-block;
  animation: scalePop 150ms ease-out;
}
/* Stage stepper node states */
.stage-node-fill {
  background-color: var(--bar-color, #2563EB);
  border-color: var(--bar-color, #2563EB);
  color: #ffffff;
}
.stage-node-pulse {
  box-shadow: 0 0 0 4px var(--track-color, #DBEAFE);
  animation: nodePulse 2s ease-in-out infinite;
}
.stage-node-idle { background-color: transparent; border-color: var(--color-border); color: var(--color-text-muted); }
.stage-label-active { font-size: 11px; max-width: 68px; color: var(--color-text-primary); font-weight: 600; }
.stage-label-idle   { font-size: 11px; max-width: 68px; color: var(--color-text-muted); font-weight: 400; }
/* Connector lines */
.connector-filled { height: 2px; background-color: var(--bar-color, #2563EB); }
.connector-dashed {
  height: 2px;
  background-image: repeating-linear-gradient(
    90deg, var(--color-border) 0, var(--color-border) 4px, transparent 4px, transparent 8px
  );
}
/* Connection status dot */
.status-dot-live  { background-color: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
.status-dot-warn  { background-color: #F59E0B; }
.status-dot-err   { background-color: #EF4444; }
/* Staggered entry animations */
.fu-0   { animation: fadeUp 400ms ease-out both; }
.fu-100 { animation: fadeUp 400ms ease-out 100ms both; }
.fu-150 { animation: fadeUp 400ms ease-out 150ms both; }
.fu-200 { animation: fadeUp 400ms ease-out 200ms both; }
.fu-250 { animation: fadeUp 400ms ease-out 250ms both; }
.fu-300 { animation: fadeUp 400ms ease-out 300ms both; }
.fu-350 { animation: fadeUp 400ms ease-out 350ms both; }
.fu-400 { animation: fadeUp 400ms ease-out 400ms both; }
.fu-450 { animation: fadeUp 400ms ease-out 450ms both; }
.fu-500 { animation: fadeUp 400ms ease-out 500ms both; }
`

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
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="stage-icon">
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
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="stage-icon">
        <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'cpsat_solving',
    label: 'Building Schedule',
    description: 'Assigning all courses to rooms and available time slots...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="stage-icon">
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
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="stage-icon">
        <path d="M8 2l1.6 3.2 3.5.5-2.55 2.48.6 3.5L8 9.95 4.85 11.68l.6-3.5L2.9 5.7l3.5-.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'rl_refinement',
    label: 'Final Polish',
    description: 'Completing final checks and quality verification...',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="stage-icon">
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
  const jobId = params.jobId as string

  const { progress, isConnected, error, reconnectAttempt } = useProgress(
    jobId,
    () => { /* completion handled via useEffect on progress.status */ },
    (err) => { console.error('[Status] generation error:', err) }
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

  // ── REST polling fallback (functional — hidden from UI) ──────────────────────
  const [sseTimedOut, setSseTimedOut] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [polledJob, setPolledJob] = useState<GenerationJob | null>(null)

  useEffect(() => {
    if (progress) { setSseTimedOut(false); return }
    const timer = setTimeout(() => setSseTimedOut(true), 30_000)
    return () => clearTimeout(timer)
  }, [progress])

  useEffect(() => {
    if (!sseTimedOut || progress) return
    let cancelled = false
    const poll = async () => {
      try {
        const job = await fetchGenerationJobStatus(jobId)
        if (!cancelled) setPolledJob(job)
      } catch { /* swallow — next tick retries */ }
    }
    poll()
    const id = setInterval(poll, 5_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [sseTimedOut, progress, jobId])

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
      <div className={`page-bg ${dmSans.className}`}>
        <div className="max-w-[680px] w-full rounded-2xl text-center modal-card modal-card--in" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <button onClick={() => router.push('/admin/timetables')} className="flex items-center gap-1.5 text-[13px] font-medium mb-6 -ml-1 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--color-danger-subtle)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--color-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className={`${dmSerifDisplay.className} text-[24px] mb-3`} style={{ color: 'var(--color-text-primary)' }}>
            Connection Lost
          </h2>
          <p className="text-[15px] mb-8 max-w-xs mx-auto" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 text-white font-semibold rounded-xl text-sm transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="px-6 py-2.5 font-semibold rounded-xl text-sm transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Back to Timetables
            </button>
          </div>
        </div>
        <style>{CSS_KEYFRAMES}</style>
      </div>
    )
  }

  // ── Connecting / loading ─────────────────────────────────────────────────────
  if (!progress) {
    return (
      <div className={`page-bg ${dmSans.className}`}>
        <div className="center-fade">
          <GoogleSpinner size={48} className="mx-auto mb-6" />
          <p className="font-semibold text-[17px] mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {reconnectAttempt > 0 ? 'Reconnecting...' : 'Connecting...'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {reconnectAttempt > 0 ? `Attempt ${reconnectAttempt} of 5` : 'Please wait a moment'}
          </p>
        </div>
        <style>{CSS_KEYFRAMES}</style>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (progress.status === 'completed') {
    return (
      <div className={`page-bg ${dmSans.className}`}>
        <div className="max-w-[680px] w-full rounded-2xl text-center modal-card modal-card--in" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <button onClick={() => router.push('/admin/timetables')} className="flex items-center gap-1.5 text-[13px] font-medium mb-4 -ml-1 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to Timetables
          </button>
          <svg className="mx-auto mb-8" width="96" height="96" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="25" fill={GREEN_TRACK} stroke={GREEN} strokeWidth="1.5" />
            <path
              d="M14 27l8 8 16-16"
              fill="none" stroke={GREEN} strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              className="check-path"
            />
          </svg>
          <h2 className={`${dmSerifDisplay.className} text-[28px] mb-3`} style={{ color: 'var(--color-text-primary)' }}>
            Timetable Ready
          </h2>
          <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            {countdown > 0
              ? `Preparing timetable data\u2026 ${countdown}`
              : 'Opening review page\u2026'}
          </p>
          <div className="w-full overflow-hidden mb-8 complete-track">
            <div className="complete-fill" />
          </div>
          <button
            onClick={() => router.push(`/admin/timetables/${jobId}/review`)}
            className="px-8 py-3 text-white font-semibold rounded-xl text-sm transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            View Timetables
          </button>
        </div>
        <style>{CSS_KEYFRAMES}</style>
      </div>
    )
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  if (progress.status === 'failed') {
    const errorMsg = progress.metadata?.error != null
      ? String(progress.metadata.error)
      : 'Something went wrong while building the timetable. Please try again.'
    return (
      <div className={`page-bg ${dmSans.className}`}>
        <div className="max-w-[680px] w-full rounded-2xl text-center modal-card modal-card--in" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <button onClick={() => router.push('/admin/timetables')} className="flex items-center gap-1.5 text-[13px] font-medium mb-6 -ml-1 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--color-danger-subtle)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--color-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className={`${dmSerifDisplay.className} text-[28px] mb-3`} style={{ color: 'var(--color-text-primary)' }}>
            Generation Failed
          </h2>
          <p className="text-[15px] mb-8 max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>{errorMsg}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/admin/timetables/new')}
              className="px-6 py-2.5 text-white font-semibold rounded-xl text-sm transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="px-6 py-2.5 font-semibold rounded-xl text-sm transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Back to Timetables
            </button>
          </div>
        </div>
        <style>{CSS_KEYFRAMES}</style>
      </div>
    )
  }

  // ── Cancelled ────────────────────────────────────────────────────────────────
  if (progress.status === 'cancelled') {
    return (
      <div className={`page-bg ${dmSans.className}`}>
        <div className="max-w-[680px] w-full bg-white border border-[#E2E8F0] rounded-2xl text-center modal-card modal-card--in">
          <button onClick={() => router.push('/admin/timetables')} className="flex items-center gap-1.5 text-[13px] text-[#64748B] hover:text-[#0F172A] font-medium mb-6 -ml-1 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to Timetables
          </button>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--color-warning-subtle)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--color-warning)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className={`${dmSerifDisplay.className} text-[28px] mb-3`} style={{ color: 'var(--color-text-primary)' }}>
            Generation Cancelled
          </h2>
          <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-secondary)' }}>The timetable generation was stopped.</p>
          <button
            onClick={() => router.push('/admin/timetables')}
            className="px-8 py-3 text-white font-semibold rounded-xl text-sm transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            Back to Timetables
          </button>
        </div>
        <style>{CSS_KEYFRAMES}</style>
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
    <div ref={containerRef} className={`page-bg ${dmSans.className}`}>

      {/* Top gradient fade — absolute so it stays within the AppShell content pane */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none top-gradient" />

      {/* Main card */}
      <div className="relative max-w-[680px] w-full rounded-2xl modal-card modal-card--in1" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>

        {/* Back navigation */}
        <button onClick={() => router.push('/admin/timetables')} className="flex items-center gap-1.5 text-[13px] font-medium mb-5 -ml-1 transition-colors fu-100" style={{ color: 'var(--color-text-secondary)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Timetables
        </button>

        {/* Institution badge */}
        <p className="text-[11px] font-medium uppercase tracking-widest mb-2 fu-150" style={{ color: 'var(--color-text-muted)' }}>
          Banaras Hindu University
        </p>

        {/* Heading — DM Sans (parent font), bold */}
        <h1 className={`text-[26px] font-bold mb-1 fu-200`} style={{ color: 'var(--color-text-primary)' }}>
          Building Your Timetable
        </h1>

        {/* Subtitle */}
        <p className="text-[15px] mb-5 fu-250" style={{ color: 'var(--color-text-secondary)' }}>
          {subtitle}
        </p>

        {/* Percentage number — key remount triggers scalePop on each integer change */}
        <div className="text-right mb-2 fu-300">
          <span
            key={Math.floor(smoothOverallProgress)}
            className={`${jetbrainsMono.className} pct-display`}
          >
            {smoothOverallProgress.toFixed(1)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="fu-350">
          <div className="relative w-full rounded-full overflow-hidden progress-track">
            {/* Coloured fill — width driven by CSS var (--progress-pct) set via DOM ref */}
            <div className="progress-fill" />
            {/* Shimmer overlay — clipped to fill width only */}
            <div className="shimmer-overlay progress-shimmer-fill" />
          </div>
        </div>

        {/* ETA + active stage description */}
        <div className="mt-3 flex items-start justify-between gap-6 fu-400">
          <p className="text-[13px] italic leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
            {activeStage.description}
          </p>
          <p className="text-[14px] whitespace-nowrap shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
            {formatETADisplay(smoothETA)}
          </p>
        </div>

        {/* Stage pipeline stepper */}
        <div className="mt-6 mb-5 fu-450">
          <div className="relative flex items-start">
            {STAGES.map((stage, i) => {
              const stageOrder  = getStageOrder(stage.key)
              const isCompleted = currentStageOrder > stageOrder
              const isActive    = progress.stage === stage.key
              const isDone      = isCompleted || isActive

              return (
                <div key={stage.key} className="flex items-start flex-1 last:flex-none">
                  {/* Node + label */}
                  <div className="flex flex-col items-center min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${isDone ? 'stage-node-fill' : 'stage-node-idle'}${isActive ? ' stage-node-pulse' : ''}`}
                    >
                      {isCompleted ? (
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" className="small-icon">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        stage.icon
                      )}
                    </div>
                    <span className={`mt-2 text-center leading-tight ${isDone ? 'stage-label-active' : 'stage-label-idle'}`}>
                      {stage.label}
                    </span>
                  </div>

                  {/* Connector line (not after last node) */}
                  {i < STAGES.length - 1 && (
                    <div className={`flex-1 self-start mt-4 mx-1 ${isCompleted ? 'connector-filled' : 'connector-dashed'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Separator */}
        <div className="h-px mb-6" style={{ background: 'var(--color-border)' }} />

        {/* Footer: connection dot + cancel */}
        <div className="flex items-center justify-between flex-wrap gap-3 fu-500">
          {/* Tiny connection indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'status-dot-live' : reconnectAttempt > 0 ? 'status-dot-warn' : 'status-dot-err'}`}
            />
            <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {isConnected ? 'Live' : reconnectAttempt > 0 ? 'Reconnecting...' : 'Offline'}
            </span>
          </div>

          {/* Cancel / inline confirmation */}
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-[13px] font-medium border px-4 py-2 rounded-xl transition-colors"
              style={{ color: 'var(--color-danger-text)', borderColor: 'var(--color-danger)' }}
            >
              Cancel Generation
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>Are you sure? This cannot be undone.</span>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-[13px] font-semibold text-white disabled:opacity-50 px-4 py-2 rounded-xl transition-colors"
                style={{ background: 'var(--color-danger)' }}
              >
                {isCancelling ? 'Stopping...' : 'Yes, stop'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-[13px] font-medium px-3 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Keep going
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{CSS_KEYFRAMES}</style>
    </div>
  )
}
