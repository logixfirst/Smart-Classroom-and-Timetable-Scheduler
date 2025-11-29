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
  { name: 'Initializing', icon: 'INIT', range: [0, 5], color: '#8B5CF6' },
  { name: 'Analyzing', icon: 'SCAN', range: [5, 15], color: '#EC4899' },
  { name: 'Scheduling', icon: 'PLAN', range: [15, 60], color: '#3B82F6' },
  { name: 'Optimizing', icon: 'TUNE', range: [60, 85], color: '#10B981' },
  { name: 'Refining', icon: 'FIX', range: [85, 95], color: '#F59E0B' },
  { name: 'Complete', icon: 'DONE', range: [95, 100], color: '#06B6D4' },
]

export default function TimetableProgressTracker({ jobId, onComplete, onCancel }: ProgressTrackerProps) {
  // Load cached state immediately (optimistic UI)
  const getCachedState = () => {
    if (typeof window === 'undefined') return null
    const cached = localStorage.getItem(`progress_${jobId}`)
    return cached ? JSON.parse(cached) : null
  }

  const cachedState = getCachedState()
  const [progress, setProgress] = useState(cachedState?.progress || 0)
  const [status, setStatus] = useState(cachedState?.status || 'loading')
  const [phase, setPhase] = useState(cachedState?.phase || 'Loading status...')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(cachedState?.timeRemaining || null)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 3

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    // Enterprise session keep-alive: Ping Django every 2 minutes to prevent timeout
    const keepSessionAlive = async () => {
      try {
        await fetch(`${API_BASE.replace('/api', '')}/health/`, {
          method: 'GET',
          credentials: 'include',
        })
      } catch (err) {
        console.debug('Session keep-alive ping failed (non-critical):', err)
      }
    }

    // Start keep-alive immediately and every 2 minutes
    keepSessionAlive()
    keepAliveIntervalRef.current = setInterval(keepSessionAlive, 120000) // 2 minutes

    const pollProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/progress/${jobId}/`, {
          credentials: 'include',
        })

        if (res.ok) {
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
        }
      } catch (err) {
        console.error('Failed to poll progress:', err)
      }
    }

    // Fetch immediately on mount to avoid showing stale "queued" state
    pollProgress()
    
    // Then start polling every 2 seconds
    pollInterval = setInterval(pollProgress, 2000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current)
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

  // Transform technical backend messages to user-friendly text
  const getUserFriendlyPhase = (backendPhase: string) => {
    const lower = backendPhase.toLowerCase()
    if (lower.includes('loading') || lower.includes('fetching')) return 'Preparing system resources...'
    if (lower.includes('clustering') || lower.includes('louvain')) return 'Grouping related courses...'
    if (lower.includes('cp-sat') || lower.includes('cpsat')) return 'Assigning classes to time slots...'
    if (lower.includes('ga') || lower.includes('genetic')) return 'Improving schedule quality...'
    if (lower.includes('rl') || lower.includes('conflict')) return 'Resolving scheduling conflicts...'
    if (lower.includes('finaliz')) return 'Preparing final timetable...'
    return backendPhase
  }

  const currentStage = getCurrentStage()
  const displayPhase = getUserFriendlyPhase(phase)

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <style jsx global>{`
        @keyframes shimmer-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.4); }
          50% { box-shadow: 0 0 30px rgba(33, 150, 243, 0.6); }
        }
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

      <div className="card overflow-hidden">
        {error ? (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="text-4xl sm:text-6xl font-bold text-red-600 dark:text-red-400 animate-bounce">ERROR</div>
            <h3 className="card-title text-red-600 dark:text-red-400">Generation Failed</h3>
            <div className="bg-[#fce8e6] dark:bg-[#ff4444]/20 border-l-4 border-[#d93025] dark:border-[#f28b82] p-4 rounded-r-lg">
              <p className="text-sm text-[#d93025] dark:text-[#f28b82]">{error}</p>
            </div>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="btn-primary"
            >
              Back to Timetables
            </button>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#2196F3] via-[#1976D2] to-[#1565C0] p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  animation: 'float-subtle 6s ease-in-out infinite'
                }} />
              </div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xl sm:text-2xl font-bold bg-white/20 px-3 py-1 rounded animate-pulse">{currentStage.icon}</div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold">
                        {progress < 5 ? 'Initializing System' : progress < 15 ? 'Analyzing Courses' : progress < 60 ? 'Scheduling Classes' : progress < 85 ? 'Optimizing Schedule' : progress < 95 ? 'Resolving Conflicts' : 'Finalizing Timetable'}
                      </h3>
                      <p className="text-blue-100 text-xs sm:text-sm">{displayPhase}</p>
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-4xl sm:text-5xl font-bold">{progress}%</div>
                    <div className="text-blue-100 text-xs">Complete</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar Section */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Main Progress Bar */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                  <span className="font-medium text-[#2C2C2C] dark:text-[#FFFFFF]">{displayPhase}</span>
                  {timeRemaining && timeRemaining > 0 && (
                    <span className="text-[#606060] dark:text-[#aaaaaa] flex items-center gap-2 text-xs sm:text-sm">
                      <span className="font-mono">TIME:</span>
                      {formatTime(timeRemaining)} remaining
                    </span>
                  )}
                </div>
                
                <div className="relative h-3 bg-[#E0E0E0] dark:bg-[#404040] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out relative"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${currentStage.color} 0%, ${currentStage.color}dd 100%)`,
                      borderRadius: progress < 100 ? '9999px 9999px 9999px 9999px' : '9999px',
                      boxShadow: `0 0 10px ${currentStage.color}40`
                    }}
                  >
                    {/* Shimmer Effect */}
                    <div
                      className="absolute inset-0 w-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                        animation: 'shimmer-progress 2s infinite',
                        borderRadius: 'inherit'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Stage Timeline */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-2">
                {STAGES.map((stage, idx) => {
                  const isActive = progress >= stage.range[0] && progress < stage.range[1]
                  const isCompleted = progress >= stage.range[1]
                  
                  return (
                    <div key={idx} className="text-center">
                      <div className={`mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                        isActive ? 'scale-110 sm:scale-125' : isCompleted ? 'scale-100' : 'scale-90 opacity-50'
                      }`} style={{
                        background: isCompleted || isActive ? stage.color : '#E0E0E0',
                        color: isCompleted || isActive ? '#FFFFFF' : '#606060',
                        boxShadow: isActive ? `0 0 20px ${stage.color}40` : 'none'
                      }}>
                        {isCompleted ? 'OK' : stage.icon}
                      </div>
                      <div className={`mt-2 text-xs font-medium transition-all ${
                        isActive ? 'text-[#2C2C2C] dark:text-[#FFFFFF]' : 'text-[#606060] dark:text-[#aaaaaa]'
                      }`}>
                        {stage.name}
                      </div>
                      <div className="text-xs text-[#606060] dark:text-[#aaaaaa] hidden sm:block">
                        {stage.range[0]}-{stage.range[1]}%
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-[#e8f0fe] dark:bg-[#065fd4]/20 p-3 sm:p-4 rounded-lg border border-[#1967d2]/20 dark:border-[#8ab4f8]/20">
                  <div className="text-xl sm:text-2xl font-bold text-[#1967d2] dark:text-[#8ab4f8]">{progress}%</div>
                  <div className="text-xs text-[#1967d2] dark:text-[#8ab4f8] font-medium">Progress</div>
                </div>
                <div className="bg-[#fef7e0] dark:bg-[#f9ab00]/20 p-3 sm:p-4 rounded-lg border border-[#b06000]/20 dark:border-[#fdd663]/20">
                  <div className="text-xl sm:text-2xl font-bold text-[#b06000] dark:text-[#fdd663]">
                    {STAGES.findIndex(s => s.name === currentStage.name) + 1}/{STAGES.length}
                  </div>
                  <div className="text-xs text-[#b06000] dark:text-[#fdd663] font-medium">Stage</div>
                </div>
                <div className="bg-[#e6f4ea] dark:bg-[#00ba7c]/20 p-3 sm:p-4 rounded-lg border border-[#137333]/20 dark:border-[#81c995]/20">
                  <div className="text-xl sm:text-2xl font-bold text-[#137333] dark:text-[#81c995]">
                    {timeRemaining ? formatTime(timeRemaining) : '--'}
                  </div>
                  <div className="text-xs text-[#137333] dark:text-[#81c995] font-medium">ETA</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-2">
                <button
                  onClick={() => router.push('/admin/timetables')}
                  className="btn-secondary"
                >
                  ← Back to Timetables
                </button>
                
                {status !== 'completed' && status !== 'failed' && status !== 'cancelled' && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="btn-danger"
                  >
                    {cancelling ? (
                      <span className="flex items-center gap-2 justify-center">
                        <div className="loading-spinner w-4 h-4"></div>
                        Cancelling...
                      </span>
                    ) : 'X Cancel Generation'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
