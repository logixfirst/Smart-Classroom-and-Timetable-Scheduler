/**
 * Enterprise Smooth Progress Bar Component — Microsoft Fluent Design Edition
 *
 * ARCHITECTURAL PRINCIPLES:
 * - No CSS transitions (JavaScript-controlled animation only)
 * - Width controlled by physics-based useSmoothProgress hook
 * - Color uses continuous HSL gradient (not discrete steps)
 * - Renders at 60 FPS via requestAnimationFrame upstream
 * - Zero re-renders of parent (isolated animation state)
 *
 * MICROSOFT FLUENT EFFECTS (WinUI ProgressBar):
 * - Sweeping shine beam traverses the filled portion (via ::before)
 * - Comet-tip glow pulses at the leading edge (via ::after)
 * - Fill brightness breathes gently to signal active work
 * - All effects pause automatically once progress reaches 100 %
 *
 * WHY NO CSS TRANSITIONS:
 * - CSS transitions cannot clamp to moving target
 * - CSS transitions overshoot when target changes
 * - CSS transitions cannot handle monotonic constraint
 * - We need frame-level control for velocity physics
 *
 * PERFORMANCE NOTES:
 * - Uses inline styles (no className changes for width/color)
 * - Shine/comet driven entirely by CSS keyframes — zero JS overhead
 * - Color computation is O(1)
 * - No DOM thrashing (single style update per frame)
 * - Safe for 60 FPS rendering
 */

import { getProgressColor } from '@/hooks/useProgress'

export interface ProgressBarProps {
  /** Animated progress value from useSmoothProgress (0-100) */
  progress: number
  /** Optional height class. Default: h-4 */
  height?: string
  /** Optional custom className for container */
  className?: string
  /** Show percentage text inside bar. Default: false */
  showLabel?: boolean
}

/**
 * Smooth animated progress bar with Microsoft Fluent shine effect.
 *
 * USAGE:
 * ```tsx
 * const smoothProgress = useSmoothProgress(backendProgress)
 * return <ProgressBar progress={smoothProgress} />
 * ```
 *
 * IMPORTANT:
 * - Do NOT pass raw backend progress (will be jumpy)
 * - Always use with useSmoothProgress hook
 * - progress value is 0-100 (not 0-1)
 *
 * @param props - ProgressBar properties
 */
export function ProgressBar({
  progress,
  height = 'h-4',
  className = '',
  showLabel = false
}: ProgressBarProps) {
  // Clamp progress to valid range (defensive)
  const clamped = Math.max(0, Math.min(100, progress))
  const roundedProgress = Math.round(clamped)
  const isComplete = clamped >= 100

  // Get continuous HSL color (red → yellow → green)
  const baseColor = getProgressColor(clamped)

  // Microsoft Fluent: inner gradient — top-left highlight, bottom-right shadow.
  // Uses rgba white/black overlays so it works with ANY baseColor without color-mix().
  const fillGradient = isComplete
    ? baseColor
    : `linear-gradient(
        105deg,
        rgba(255,255,255,0.22) 0%,
        rgba(255,255,255,0.05) 40%,
        rgba(0,0,0,0.08) 100%
      ), ${baseColor}`

  return (
    <div
      className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height} overflow-hidden relative ${className}`}
      role="progressbar"
      aria-label="Progress"
      aria-valuenow={roundedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* ── Fill bar ─────────────────────────────────────────────────────── */}
      <div
        className={`${height} relative overflow-hidden`}
        style={{
          width: `${clamped}%`,
          background: fillGradient,
          // Width animation is driven by requestAnimationFrame in useSmoothProgress.
          // No CSS transition — would overshoot on fast target changes.
          transition: 'none',
          borderRadius: 'inherit',
          // Opacity breathe: signals the solver is actively working.
          // NOTE: We use opacity NOT filter:brightness because filter on the
          // fill div creates a GPU compositing layer which breaks
          // overflow:hidden clipping for the child shine span's translateX
          // animation in Chrome/Safari (shine leaks outside the fill bar).
          // Stops automatically when complete (isComplete guard below).
          animation: isComplete
            ? 'none'
            : 'progress-fill-breathe 3s ease-in-out infinite',
        }}
      >
        {/* ── Microsoft Fluent shine beam ──────────────────────────────────
             A skewed white gradient that sweeps left → right continuously.
             Real <span> child so fill div's overflow:hidden clips it.
             Fill div must NOT use filter:brightness — that creates a separate
             GPU compositing layer that breaks the overflow clip in Chrome/Safari.
             Use opacity-based breathe on fill div instead (no compositing side-effect). */}
        {!isComplete && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '42%',
              background:
                'linear-gradient(90deg,' +
                'transparent 0%,' +
                'rgba(255,255,255,0.15) 20%,' +
                'rgba(255,255,255,0.72) 50%,' +
                'rgba(255,255,255,0.15) 80%,' +
                'transparent 100%)',
              animation:
                'progress-shine 2.2s cubic-bezier(0.4,0,0.6,1) infinite',
              pointerEvents: 'none',
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* ── Comet tip ────────────────────────────────────────────────────
             A narrow bright strip at the right edge that pulses outward,
             giving the impression that the bar is pushing forward.         */}
        {!isComplete && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '5px',
              background: 'rgba(255,255,255,0.75)',
              borderRadius: '0 9999px 9999px 0',
              animation:
                'progress-comet-pulse 1.6s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {showLabel && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'white',
              mixBlendMode: 'difference',
              zIndex: 10,
            }}
          >
            {Math.floor(clamped)}%
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Progress bar with stage indicator and ETA.
 * Combines progress bar with metadata display.
 * 
 * @example
 * ```tsx
 * const smoothProgress = useSmoothProgress(progress?.overall_progress || 0)
 * const smoothETA = useSmoothedETA(progress?.eta_seconds || 0)
 * 
 * return (
 *   <ProgressBarWithInfo
 *     progress={smoothProgress}
 *     stage="Scheduling Classes"
 *     eta={formatETA(smoothETA)}
 *   />
 * )
 * ```
 */
export interface ProgressBarWithInfoProps extends ProgressBarProps {
  /** Current stage label */
  stage?: string
  /** Formatted ETA string */
  eta?: string
  /** Stage-specific progress (0-100) */
  stageProgress?: number
}

export function ProgressBarWithInfo({
  progress,
  stage,
  eta,
  stageProgress,
  height = 'h-4',
  className = ''
}: ProgressBarWithInfoProps) {
  return (
    <div className={className}>
      {/* Header with stage and percentage */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {stage && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {stage}
            </span>
          )}
          {stageProgress !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({Math.floor(stageProgress)}%)
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {Math.floor(progress)}%
        </span>
      </div>
      
      {/* Progress bar */}
      <ProgressBar progress={progress} height={height} />
      
      {/* ETA */}
      {eta && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
          ETA: {eta}
        </div>
      )}
    </div>
  )
}
