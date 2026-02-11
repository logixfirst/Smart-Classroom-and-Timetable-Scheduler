/**
 * Enterprise Smooth Progress Bar Component
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - No CSS transitions (JavaScript-controlled animation only)
 * - Width controlled by physics-based useSmoothProgress hook
 * - Color uses continuous HSL gradient (not discrete steps)
 * - Renders at 60 FPS via requestAnimationFrame upstream
 * - Zero re-renders of parent (isolated animation state)
 * 
 * WHY NO CSS TRANSITIONS:
 * - CSS transitions cannot clamp to moving target
 * - CSS transitions overshoot when target changes
 * - CSS transitions cannot handle monotonic constraint
 * - We need frame-level control for velocity physics
 * 
 * PERFORMANCE NOTES:
 * - Uses inline styles (no className changes)
 * - Color computation is O(1)
 * - No DOM thrashing (single style update)
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
 * Smooth animated progress bar with continuous color gradient.
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
  
  // Get continuous HSL color (red → yellow → green)
  const color = getProgressColor(clamped)
  
  return (
    <div
      className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height} overflow-hidden relative ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${height} relative`}
        style={{
          width: `${clamped}%`,
          backgroundColor: color,
          // CRITICAL: No CSS transitions
          // Animation is controlled by requestAnimationFrame in hook
          transition: 'none'
        }}
      >
        {showLabel && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
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
