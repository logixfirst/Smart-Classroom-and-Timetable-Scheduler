'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ProgressTrackerProps {
  jobId: string
  onComplete: (timetableId: string) => void
  onCancel?: () => void
}

interface StageInfo {
  name: string
  icon: string
  range: [number, number]
  color: string
}

const STAGES: StageInfo[] = [
  { name: 'Loading Data', icon: '📚', range: [0, 5], color: '#FF0000' },
  { name: 'Assigning Courses', icon: '🎯', range: [5, 10], color: '#FF4500' },
  { name: 'Scheduling Classes', icon: '📅', range: [10, 60], color: '#FFA500' },
  { name: 'Optimizing Schedule', icon: '⚡', range: [60, 85], color: '#FFD700' },
  { name: 'Resolving Conflicts', icon: '🔧', range: [85, 95], color: '#9ACD32' },
  { name: 'Finalizing Timetable', icon: '✅', range: [95, 100], color: '#00A651' },
]

export default function TimetableProgressTracker({ jobId, onComplete, onCancel }: ProgressTrackerProps) {
  // Load cached state immediately (optimistic UI)
  const getCachedState = () => {
    if (typeof window === 'undefined') return null
    const cached = localStorage.getItem(`progress_${jobId}`)
    return cached ? JSON.parse(cached) : null
  }

  const cachedState = getCachedState()
  const [progress, setProgress] = useState(cachedState?.progress ?? 0)
  const [status, setStatus] = useState(cachedState?.status || 'loading')
  const [phase, setPhase] = useState(cachedState?.phase || 'Initializing...')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(cachedState?.timeRemaining ?? 720)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 3

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let retryCount = 0
    const MAX_RETRIES = 5

    const pollProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/progress/${jobId}/`, {
          credentials: 'include',
        })

        if (res.ok) {
          retryCount = 0 // Reset retry count on success
          const data = await res.json()
          const newProgress = data.progress || 0
          const newStatus = data.status || 'running'
          const newPhase = data.stage || data.message || 'Processing...'
          const newTimeRemaining = data.time_remaining_seconds || null

          setProgress(newProgress)
          setStatus(newStatus)
          setPhase(newPhase)
          setTimeRemaining(newTimeRemaining)

          // Cache state for instant load on refresh (enterprise pattern)
          if (typeof window !== 'undefined') {
            localStorage.setItem(`progress_${jobId}`, JSON.stringify({
              progress: newProgress,
              status: newStatus,
              phase: newPhase,
              timeRemaining: newTimeRemaining
            }))
          }

          if (data.status === 'completed') {
            // Clear cache on completion
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`progress_${jobId}`)
            }
            if (pollInterval) clearInterval(pollInterval)
            onComplete(jobId)
          } else if (data.status === 'failed') {
            if (pollInterval) clearInterval(pollInterval)
            setError(data.message || data.error || 'Generation failed')
            // Clear cache on failure
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`progress_${jobId}`)
            }
          } else if (data.status === 'cancelled') {
            if (pollInterval) clearInterval(pollInterval)
            setPhase('Generation cancelled')
            // Clear cache on cancellation
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`progress_${jobId}`)
            }
          }
        } else if (res.status === 404 && retryCount < MAX_RETRIES) {
          // Job not found yet (race condition) - retry with exponential backoff
          retryCount++
          console.log(`Job not found yet (attempt ${retryCount}/${MAX_RETRIES}), retrying...`)
          setPhase('Initializing generation...')
          setStatus('initializing')
          return // Don't set error yet
        } else if (res.status === 404) {
          // After max retries, show error
          setError('Job not found. Please try again.')
        }
      } catch (err) {
        console.error('Failed to poll progress:', err)
        if (retryCount < MAX_RETRIES) {
          retryCount++
          setPhase('Connecting to server...')
        }
      }
    }

    // Poll immediately, then every 1 second for real-time updates
    pollProgress()
    pollInterval = setInterval(pollProgress, 1000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [jobId, onComplete])

  const handleCancel = async () => {
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      alert(`Cannot cancel ${status} process`)
      return
    }

    if (!confirm('Are you sure you want to cancel this generation? This cannot be undone.')) {
      return
    }

    setCancelling(true)
    try {
      const res = await fetch(`${API_BASE}/generation-jobs/${jobId}/cancel/`, {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        setStatus('cancelled')
        setPhase('Generation cancelled by user')
        if (onCancel) onCancel()
      } else {
        const data = await res.json()
        alert(`Failed to cancel: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to cancel generation:', err)
      alert('Failed to cancel generation')
    } finally {
      setCancelling(false)
    }
  }

  // Get current stage based on progress
  const getCurrentStage = () => {
    return STAGES.find(stage => progress >= stage.range[0] && progress < stage.range[1]) || STAGES[STAGES.length - 1]
  }

  const currentStage = getCurrentStage()
  const currentStageIndex = STAGES.findIndex(s => s.name === currentStage.name)

  // Get progress color based on percentage (red to green gradient)
  const getProgressColor = (prog: number) => {
    if (prog < 20) return '#FF0000' // Red
    if (prog < 40) return '#FF4500' // Orange-Red
    if (prog < 60) return '#FFA500' // Orange
    if (prog < 80) return '#FFD700' // Yellow
    if (prog < 95) return '#9ACD32' // Yellow-Green
    return '#00A651' // Green
  }

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.5; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {error ? (
        <div className="card">
          <div className="p-6 sm:p-8 text-center space-y-6 animate-[slide-up_0.4s_ease-out]">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#2C2C2C] dark:text-[#FFFFFF] mb-2">Generation Failed</h3>
              <p className="text-sm text-[#606060] dark:text-[#aaaaaa]">{error}</p>
            </div>
            <button onClick={() => router.push('/admin/timetables')} className="btn-primary">
              Back to Timetables
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          {/* Header Section */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-[#2196F3]/10 dark:bg-[#2196F3]/20 flex items-center justify-center text-2xl">
                  {currentStage.icon}
                </div>
                {status === 'running' && (
                  <div className="absolute inset-0 rounded-xl border-2 border-[#2196F3] animate-[pulse-ring_2s_ease-in-out_infinite]"></div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#2C2C2C] dark:text-[#FFFFFF]">
                  Generating Timetable
                </h2>
                <p className="text-sm text-[#606060] dark:text-[#aaaaaa]">{currentStage.name}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-[#2196F3]">{progress}%</div>
              {timeRemaining && timeRemaining > 0 && (
                <div className="text-xs text-[#606060] dark:text-[#aaaaaa] font-medium mt-1">
                  {formatTime(timeRemaining)} remaining
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="relative h-2 bg-[#F5F5F5] dark:bg-[#2C2C2C] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out relative"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getProgressColor(progress)
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>

          {/* Horizontal Stage Timeline */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-2">
              {STAGES.map((stage, idx) => {
                const isActive = progress >= stage.range[0] && progress < stage.range[1]
                const isCompleted = progress >= stage.range[1]
                
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 relative">
                    {/* Connecting Line */}
                    {idx < STAGES.length - 1 && (
                      <div className="absolute top-5 left-1/2 w-full h-0.5 -z-10 transition-colors duration-300" style={{
                        backgroundColor: isCompleted ? '#00A651' : '#E0E0E0'
                      }} />
                    )}
                    
                    {/* Stage Circle */}
                    <div className="relative mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        isActive ? 'scale-110 shadow-md' : ''
                      }`} style={{
                        backgroundColor: isCompleted ? '#00A651' : isActive ? stage.color : '#E0E0E0',
                        color: isCompleted || isActive ? '#FFFFFF' : '#606060'
                      }}>
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          stage.icon
                        )}
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 rounded-full animate-[pulse-ring_2s_ease-in-out_infinite]" style={{
                          border: `2px solid ${stage.color}`,
                          opacity: 0.6
                        }} />
                      )}
                    </div>
                    
                    {/* Stage Name */}
                    <div className={`text-xs text-center font-medium transition-all ${
                      isActive ? 'text-[#2C2C2C] dark:text-[#FFFFFF]' : 
                      isCompleted ? 'text-[#606060] dark:text-[#aaaaaa]' :
                      'text-[#aaaaaa] dark:text-[#606060]'
                    }`}>
                      {stage.name}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t border-[#E0E0E0] dark:border-[#2C2C2C]">
            <button
              onClick={() => router.push('/admin/timetables')}
              className="btn-secondary"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            
            {status !== 'completed' && status !== 'failed' && status !== 'cancelled' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-danger"
              >
                {cancelling ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cancelling...
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
