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
 *    - Red (0%) → Yellow (50%) → Green (100%)
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
import { 
  useProgress, 
  formatETA, 
  getStageDisplayName,
  useSmoothProgress,
  useSmoothedETA,
  getProgressColor
} from '@/hooks/useProgress'
import { ProgressBarWithInfo } from '@/components/ui/progress-bar'
import { useEffect } from 'react'

export default function TimetableStatusPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const { progress, isConnected, error, reconnectAttempt } = useProgress(
    jobId,
    // On completion
    (data) => {
      console.log('Generation completed:', data.job_id)
      setTimeout(() => {
        router.push(`/admin/timetables`)
      }, 2000)
    },
    // On error
    (err) => {
      console.error('Generation failed:', err)
    }
  )

  // ========================================
  // ENTERPRISE SMOOTH ANIMATION INTEGRATION
  // ========================================
  // Apply velocity-based physics to raw backend progress
  // This creates smooth 60 FPS animation even with irregular updates
  
  const smoothOverallProgress = useSmoothProgress(
    progress?.overall_progress || 0,
    {
      acceleration: 0.02,   // Moderate acceleration feel
      damping: 0.85,        // Natural deceleration
      epsilon: 0.05,        // Snap within 0.05%
      completionDuration: 600  // Smooth 600ms finish
    }
  )
  
  const smoothStageProgress = useSmoothProgress(
    progress?.stage_progress || 0,
    {
      acceleration: 0.03,   // Slightly faster for stage (changes more frequently)
      damping: 0.8,         // Less damping for quicker response
      epsilon: 0.1,
      completionDuration: 400
    }
  )
  
  // Exponential smoothing for ETA (prevents jarring jumps)
  const smoothETA = useSmoothedETA(
    progress?.eta_seconds || 0,
    0.15  // 15% weight to new value (moderate smoothing)
  )

  // Handle terminal states
  useEffect(() => {
    if (progress?.status === 'completed') {
      setTimeout(() => {
        router.push(`/admin/timetables`)
      }, 2000)
    }
  }, [progress?.status, router])

  // Render connection error
  if (error && reconnectAttempt > 5) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-[#2C2C2C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
              <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
              Connection Lost
            </h2>
            <p className="text-[#606060] dark:text-[#aaaaaa] mb-8">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                Retry Connection
              </button>
              <button
                onClick={() => router.push('/admin/timetables')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-[#2C2C2C] dark:text-white font-semibold transition-colors"
              >
                Back to Timetables
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render initial loading state
  if (!progress && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 mb-4"></div>
          <p className="text-lg font-semibold text-[#2C2C2C] dark:text-white mb-2">
            Connecting to generation service...
          </p>
          <p className="text-sm text-[#606060] dark:text-[#aaaaaa] font-mono">
            Job ID: {jobId}
          </p>
          {reconnectAttempt > 0 && (
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              Reconnecting... (attempt {reconnectAttempt}/5)
            </p>
          )}
        </div>
      </div>
    )
  }

  // Render completion state
  if (progress?.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-[#2C2C2C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
              <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
              Schedule Ready!
            </h2>
            <p className="text-[#606060] dark:text-[#aaaaaa] mb-8 text-lg">
              Your timetable has been successfully generated and is ready for review.
            </p>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              View Timetables
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render failed state
  if (progress?.status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-[#2C2C2C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
              <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
              Generation Failed
            </h2>
            <p className="text-[#606060] dark:text-[#aaaaaa] mb-8 text-lg">
              {progress.metadata?.error || 'An error occurred during timetable generation.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/admin/timetables')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#2C2C2C] dark:text-white font-semibold rounded-lg transition-colors"
              >
                Back to Timetables
              </button>
              <button
                onClick={() => router.push('/admin/timetables/new')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render cancelled state
  if (progress?.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-[#2C2C2C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
              <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">
              Cancelled by User
            </h2>
            <p className="text-[#606060] dark:text-[#aaaaaa] mb-8 text-lg">
              The timetable generation was cancelled.
            </p>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              Back to Timetables
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render active progress state
  // Use SMOOTH values for display (not raw backend values)
  const stageName = getStageDisplayName(progress?.stage || 'initializing')
  const overallProgress = smoothOverallProgress  // Physics-animated
  const stageProgress = smoothStageProgress      // Physics-animated
  const eta = formatETA(smoothETA)               // Exponentially smoothed

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white dark:bg-[#2C2C2C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#2C2C2C] dark:text-white mb-2">
            Generating Timetable
          </h1>
          <p className="text-[#606060] dark:text-[#aaaaaa] mb-3">
            Please wait while we optimize your schedule...
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">Job ID:</span>
            <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">{jobId}</span>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="mb-8 flex items-center justify-between">
          {/* Left: Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-xs font-medium text-[#606060] dark:text-[#aaaaaa]">
                {isConnected ? 'Live Updates' : 'Disconnected'}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 font-medium">
              60 FPS Animation
            </div>
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/timetables')}
              className="px-4 py-2 text-sm font-medium text-[#606060] dark:text-[#aaaaaa] hover:text-[#2C2C2C] dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to cancel timetable generation?')) {
                  try {
                    await fetch(`${process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000'}/api/generation-jobs/${jobId}/cancel/`, {
                      method: 'POST',
                      credentials: 'include'
                    })
                    router.push('/admin/timetables')
                  } catch (error) {
                    console.error('Failed to cancel:', error)
                  }
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Generation
            </button>
          </div>
        </div>

        {/* Overall Progress Bar - Enterprise Smooth Animation */}
        <div className="mb-8 p-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-[#2C2C2C] dark:text-white">
              Overall Progress
            </span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.floor(overallProgress)}%
            </span>
          </div>
          {/* Physics-based smooth progress bar with HSL color gradient */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden shadow-inner">
            <div
              className="h-5 rounded-full"
              style={{
                width: `${overallProgress}%`,
                backgroundColor: getProgressColor(overallProgress),
                // NO CSS transitions - animation via requestAnimationFrame
                transition: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        </div>

        {/* Current Stage */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-xl p-6 mb-8 border border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[#606060] dark:text-[#aaaaaa] uppercase tracking-wide font-semibold mb-1">
                Current Stage
              </p>
              <h3 className="text-2xl font-bold text-[#2C2C2C] dark:text-white flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse"></span>
                {stageName}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#606060] dark:text-[#aaaaaa] uppercase tracking-wide font-semibold mb-1">
                Stage Progress
              </p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {Math.floor(stageProgress)}%
              </p>
            </div>
          </div>
          
          {/* Stage Progress Bar - Smooth Animation */}
          <div className="w-full bg-white dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-3 rounded-full"
              style={{
                width: `${stageProgress}%`,
                backgroundColor: getProgressColor(stageProgress),
                transition: 'none'  // No CSS transitions
              }}
            />
          </div>
        </div>

        {/* Estimated Time Remaining */}
        <div className="text-center mb-8 p-6 bg-white dark:bg-[#2C2C2C] rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-[#606060] dark:text-[#aaaaaa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-[#606060] dark:text-[#aaaaaa] uppercase tracking-wide">
              Time Remaining
            </p>
          </div>
          <p className="text-4xl font-bold text-[#2C2C2C] dark:text-white">
            {eta}
          </p>
        </div>

        {/* Stage Breakdown */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[#2C2C2C] dark:text-white mb-4 uppercase tracking-wide">
            Generation Pipeline
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {[
              { name: 'Data Load', key: 'loading', weight: '5%' },
              { name: 'Organize', key: 'clustering', weight: '10%' },
              { name: 'Build', key: 'cpsat_solving', weight: '60%' },
              { name: 'Optimize', key: 'ga_optimization', weight: '15%' },
              { name: 'Finalize', key: 'rl_refinement', weight: '10%' }
            ].map(stage => {
              const isCurrent = progress?.stage === stage.key
              const isPast = getStageOrder(progress?.stage || '') > getStageOrder(stage.key)
              
              return (
                <div
                  key={stage.key}
                  className={`p-4 rounded-xl text-center transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 dark:bg-indigo-600 shadow-lg scale-105'
                      : isPast
                      ? 'bg-green-500 dark:bg-green-600 shadow-md'
                      : 'bg-gray-200 dark:bg-gray-700 opacity-60'
                  }`}
                >
                  <p className={`text-xs font-bold mb-1 ${
                    isCurrent || isPast
                      ? 'text-white'
                      : 'text-[#606060] dark:text-[#aaaaaa]'
                  }`}>
                    {stage.name}
                  </p>
                  <p className={`text-[10px] ${
                    isCurrent || isPast
                      ? 'text-white/80'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {stage.weight}
                  </p>
                  {isPast && <div className="text-lg mt-1">✓</div>}
                  {isCurrent && <div className="text-lg mt-1 animate-pulse">⏳</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-[#606060] dark:text-[#aaaaaa] font-semibold mb-1 uppercase tracking-wide">Stage</p>
            <p className="text-sm font-bold text-[#2C2C2C] dark:text-white truncate">{stageName}</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-[#606060] dark:text-[#aaaaaa] font-semibold mb-1 uppercase tracking-wide">Progress</p>
            <p className="text-sm font-bold text-[#2C2C2C] dark:text-white">{Math.floor(overallProgress)}%</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-[#606060] dark:text-[#aaaaaa] font-semibold mb-1 uppercase tracking-wide">ETA</p>
            <p className="text-sm font-bold text-[#2C2C2C] dark:text-white">{eta}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper to determine stage order for UI visual states
 */
function getStageOrder(stage: string): number {
  const order: Record<string, number> = {
    'initializing': 0,
    'loading': 1,
    'clustering': 2,
    'cpsat_solving': 3,
    'ga_optimization': 4,
    'rl_refinement': 5,
    'completed': 6,
    'failed': 6,
    'cancelled': 6
  }
  return order[stage] || 0
}
