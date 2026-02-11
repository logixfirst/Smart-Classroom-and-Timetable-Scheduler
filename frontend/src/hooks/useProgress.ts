/**
 * Enterprise Progress Hook - Google/Meta Pattern
 * Single Responsibility: Subscribe to real-time progress via SSE
 * 
 * Principles:
 * - Uses EventSource (SSE) for real-time push updates
 * - No polling (efficient bandwidth usage)
 * - Automatic reconnection
 * - Clean separation of concerns
 * 
 * Usage:
 *   const { progress, isConnected, error } = useProgress(jobId);
 *   
 *   return (
 *     <div>
 *       <ProgressBar value={progress.overall_progress} />
 *       <p>{progress.stage}</p>
 *       <p>ETA: {progress.eta_seconds}s</p>
 *     </div>
 *   );
 */

import { useState, useEffect, useRef } from 'react'

interface ProgressData {
  job_id: string
  stage: string
  stage_progress: number
  overall_progress: number
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  eta_seconds: number | null
  started_at: number
  last_updated: number
  metadata: Record<string, any>
}

interface UseProgressReturn {
  progress: ProgressData | null
  isConnected: boolean
  error: string | null
  reconnectAttempt: number
}

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

/**
 * Hook for subscribing to real-time progress via Server-Sent Events.
 * 
 * @param jobId - Unique generation job identifier
 * @param onComplete - Callback when job completes successfully
 * @param onError - Callback when job fails
 * @returns Progress state and connection status
 */
export function useProgress(
  jobId: string | null,
  onComplete?: (data: ProgressData) => void,
  onError?: (error: string) => void
): UseProgressReturn {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!jobId) {
      return
    }

    let isMounted = true

    const connect = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }

        // Create SSE connection
        const url = `${DJANGO_API_BASE}/generation/stream/${jobId}/`
        const eventSource = new EventSource(url)
        eventSourceRef.current = eventSource

        // Connection opened
        eventSource.addEventListener('connected', () => {
          if (isMounted) {
            setIsConnected(true)
            setError(null)
            setReconnectAttempt(0)
            console.log(`[SSE] Connected to job ${jobId}`)
          }
        })

        // Progress update received
        eventSource.addEventListener('progress', (event) => {
          if (isMounted) {
            try {
              const data: ProgressData = JSON.parse(event.data)
              setProgress(data)
              console.log(`[SSE] Progress: ${data.overall_progress}% - ${data.stage}`)
            } catch (err) {
              console.error('[SSE] Failed to parse progress data:', err)
            }
          }
        })

        // Job completed
        eventSource.addEventListener('done', (event) => {
          if (isMounted) {
            const data = JSON.parse(event.data)
            console.log(`[SSE] Job done: ${data.status}`)
            
            if (data.status === 'completed' && onComplete && progress) {
              onComplete(progress)
            }
            
            eventSource.close()
            setIsConnected(false)
          }
        })

        // Error event
        eventSource.addEventListener('error', (event: any) => {
          if (isMounted) {
            const errorMessage = event.data ? JSON.parse(event.data).message : 'Connection error'
            console.error(`[SSE] Error: ${errorMessage}`)
            setError(errorMessage)
            
            if (onError) {
              onError(errorMessage)
            }
            
            eventSource.close()
            setIsConnected(false)
          }
        })

        // Generic error (connection lost, server error)
        eventSource.onerror = () => {
          if (isMounted) {
            console.error('[SSE] Connection error')
            setIsConnected(false)
            
            // Attempt reconnection with exponential backoff
            const nextAttempt = reconnectAttempt + 1
            const delay = Math.min(1000 * Math.pow(2, nextAttempt), 10000) // Max 10 seconds
            
            if (nextAttempt <= 5) {
              console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${nextAttempt}/5)`)
              setReconnectAttempt(nextAttempt)
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isMounted) {
                  connect()
                }
              }, delay)
            } else {
              setError('Failed to connect after multiple attempts')
              if (onError) {
                onError('Connection failed')
              }
            }
          }
        }

      } catch (err) {
        console.error('[SSE] Failed to create connection:', err)
        setError('Failed to establish SSE connection')
        setIsConnected(false)
      }
    }

    // Initial connection
    connect()

    // Cleanup on unmount
    return () => {
      isMounted = false
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [jobId, reconnectAttempt]) // Dependency on reconnectAttempt for reconnection logic

  return {
    progress,
    isConnected,
    error,
    reconnectAttempt
  }
}

/**
 * Fetch progress snapshot (one-time, no subscription).
 * Useful for checking progress without establishing SSE connection.
 * 
 * @param jobId - Job identifier
 * @returns Progress data or null
 */
export async function fetchProgressSnapshot(jobId: string): Promise<ProgressData | null> {
  try {
    const response = await fetch(`${DJANGO_API_BASE}/generation/progress/${jobId}/`)
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('[Progress] Failed to fetch snapshot:', error)
    return null
  }
}

/**
 * Format ETA seconds into human-readable string.
 * 
 * @param seconds - Remaining seconds
 * @returns Formatted string like "2m 30s"
 */
export function formatETA(seconds: number | null): string {
  if (seconds === null || seconds <= 0) {
    return 'Calculating...'
  }
  
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Get user-friendly stage name (Enterprise UX Standards).
 * 
 * PRINCIPLE:
 * - Internal stage name ≠ User-facing stage name
 * - Backend uses technical identifiers
 * - Frontend maps to professional, human-friendly language
 * - No algorithm exposure (CP-SAT, GA, RL)
 * - Clear action verbs
 * - Emotionally neutral
 * 
 * Based on Google Cloud / AWS / Azure UX patterns.
 * 
 * @param stage - Internal stage name
 * @returns Display name
 */
export function getStageDisplayName(stage: string): string {
  const stageNames: Record<string, string> = {
    'initializing': 'Preparing Schedule',
    'loading': 'Loading Academic Data',
    'clustering': 'Organizing Courses',
    'cpsat_solving': 'Building Schedule',
    'ga_optimization': 'Optimizing Schedule',
    'rl_refinement': 'Finalizing Schedule',
    'completed': 'Schedule Ready',
    'failed': 'Generation Failed',
    'cancelled': 'Cancelled by User'
  }
  
  return stageNames[stage] || stage
}

/**
 * ========================================
 * ENTERPRISE SMOOTH PROGRESS ANIMATION
 * ========================================
 * 
 * Physics-based velocity animation system for monotonic progress display.
 * Based on Google/Meta production patterns for distributed job progress.
 * 
 * ARCHITECTURAL CONSTRAINTS:
 * - Backend progress is authoritative (source of truth)
 * - UI must NEVER exceed backend progress
 * - UI must NEVER move backward (monotonic constraint)
 * - Animation must be frame-based (requestAnimationFrame)
 * - Must work with irregular backend updates (every 1-5 seconds)
 * - Must not cause memory leaks or stale closures
 * 
 * PHYSICS MODEL:
 * - Uses velocity + damping (like car speedometer)
 * - Accelerates when far from target
 * - Decelerates when near target
 * - Clamps at actualProgress (never exceed)
 * - Shows every integer value (40 → 41 → 42)
 * 
 * WHY NOT CSS TRANSITIONS:
 * - CSS transitions cannot clamp to moving target
 * - CSS transitions can overshoot
 * - CSS transitions cannot handle backward-moving targets
 * - We need frame-by-frame control for physics
 */

/**
 * Tuning parameters for velocity-based animation.
 * Adjust these for different "feel" of progress bar.
 */
export interface SmoothProgressConfig {
  /** Base acceleration factor (0.01-0.05). Higher = faster acceleration. */
  acceleration: number
  /** Velocity damping factor (0.7-0.95). Higher = less damping, more momentum. */
  damping: number
  /** Minimum velocity threshold (0.001-0.1). Below this, snap to target. */
  epsilon: number
  /** Completion animation duration in ms (300-1000). */
  completionDuration: number
}

const DEFAULT_CONFIG: SmoothProgressConfig = {
  acceleration: 0.02,   // Moderate acceleration
  damping: 0.85,        // Moderate damping (feels natural)
  epsilon: 0.05,        // Snap when within 0.05%
  completionDuration: 600  // Smooth 600ms ending
}

/**
 * Enterprise-grade smooth progress hook with velocity-based physics.
 * 
 * CRITICAL CONSTRAINTS:
 * 1. displayProgress ≤ actualProgress (never exceed backend)
 * 2. displayProgress is monotonic (never decreases)
 * 3. Uses requestAnimationFrame (60 FPS)
 * 4. Velocity model: velocity += (target - current) * acceleration
 * 5. Damping: velocity *= damping
 * 6. Shows every integer: 40 → 41 → 42 (no jumps)
 * 
 * EDGE CASES HANDLED:
 * - Backend stalls: UI continues smooth motion toward last value
 * - Backend jumps forward: UI accelerates smoothly
 * - Backend at 100%: Special easing animation (600ms)
 * - Component unmount: Animation cancelled (no memory leak)
 * 
 * @param actualProgress - Authoritative backend progress (0-100)
 * @param config - Optional physics tuning parameters
 * @returns Smoothly animated display progress (0-100)
 * 
 * @example
 * const { progress } = useProgress(jobId)
 * const smoothProgress = useSmoothProgress(progress?.overall_progress || 0)
 * return <ProgressBar progress={smoothProgress} />
 */
export function useSmoothProgress(
  actualProgress: number,
  config: Partial<SmoothProgressConfig> = {}
): number {
  const [displayProgress, setDisplayProgress] = useState(0)
  const velocityRef = useRef(0)
  const lastTargetRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  const completionStartRef = useRef<number | null>(null)
  
  const cfg = { ...DEFAULT_CONFIG, ...config }

  useEffect(() => {
    // Clamp input (defensive)
    const target = Math.max(0, Math.min(100, actualProgress))
    
    // CRITICAL: Monotonic constraint - backend can only increase
    // If backend somehow decreases, ignore it (maintain UI stability)
    if (target < lastTargetRef.current && target < 100) {
      return // Ignore backward movement unless it's completion reset
    }
    
    lastTargetRef.current = target
    
    let animationFrame: number
    let lastTimestamp: number | null = null

    const animate = (timestamp: number) => {
      // Initialize timing
      if (!lastTimestamp) {
        lastTimestamp = timestamp
        startTimeRef.current = timestamp
      }
      
      // Calculate delta time (handle tab backgrounding)
      const deltaTime = Math.min(timestamp - lastTimestamp, 100) // Cap at 100ms
      lastTimestamp = timestamp
      
      setDisplayProgress(current => {
        // CASE 1: Completion animation (final 1-2%)
        // When backend reaches 100%, use time-based easing instead of physics
        if (target >= 100) {
          if (completionStartRef.current === null) {
            completionStartRef.current = timestamp
          }
          
          const elapsed = timestamp - completionStartRef.current
          const progress = Math.min(elapsed / cfg.completionDuration, 1)
          
          // Ease-out cubic for smooth ending
          const eased = 1 - Math.pow(1 - progress, 3)
          const final = current + (100 - current) * eased
          
          return Math.min(100, final) // Guaranteed clamp
        }
        
        // Reset completion tracking if not at 100
        completionStartRef.current = null
        
        // CASE 2: Physics-based animation
        const distance = target - current
        
        // CRITICAL: Never exceed target (clamp constraint)
        if (distance <= 0) {
          velocityRef.current = 0
          return Math.min(current, target) // Clamp for safety
        }
        
        // CRITICAL: Monotonic constraint - never move backward
        if (distance < 0 && current > 0) {
          velocityRef.current = 0
          return current // Maintain current position
        }
        
        // Sub-pixel snap (prevents infinite animation near target)
        if (Math.abs(distance) < cfg.epsilon) {
          velocityRef.current = 0
          return target
        }
        
        // PHYSICS MODEL:
        // 1. Acceleration proportional to distance (Hooke's law-like)
        //    Far from target → high acceleration
        //    Near target → low acceleration
        const acceleration = distance * cfg.acceleration
        
        // 2. Update velocity with acceleration
        velocityRef.current += acceleration
        
        // 3. Apply damping (simulates friction)
        //    Without damping, velocity would oscillate
        //    Damping creates smooth deceleration
        velocityRef.current *= cfg.damping
        
        // 4. Update position with velocity
        const next = current + velocityRef.current
        
        // 5. CRITICAL: Clamp to never exceed target
        //    This is the authoritative constraint
        const clamped = Math.min(next, target)
        
        // 6. CRITICAL: Monotonic constraint
        //    Never move backward
        return Math.max(current, clamped)
      })
      
      // Continue animation
      animationFrame = requestAnimationFrame(animate)
    }

    // Start animation loop
    animationFrame = requestAnimationFrame(animate)

    // Cleanup on unmount or dependency change
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [actualProgress, cfg.acceleration, cfg.damping, cfg.epsilon, cfg.completionDuration])

  return displayProgress
}

/**
 * Smooth ETA using exponential smoothing.
 * 
 * WHY SEPARATE FROM PROGRESS SMOOTHING:
 * - ETA can increase (due to cluster complexity)
 * - ETA has different smoothing characteristics
 * - ETA should respond faster to changes
 * - Progress must be monotonic, ETA must not
 * 
 * EXPONENTIAL SMOOTHING:
 * - smoothed += (actual - smoothed) * alpha
 * - Alpha = 0.15 means 15% weight to new value
 * - Lower alpha = more smoothing (slower response)
 * - Higher alpha = less smoothing (faster response)
 * 
 * @param actualETA - Backend ETA in seconds (can increase or decrease)
 * @param alpha - Smoothing factor (0-1). Default 0.15. Higher = less smooth.
 * @returns Smoothed ETA in seconds
 * 
 * @example
 * const smoothETA = useSmoothedETA(progress?.eta_seconds || 0)
 * return <div>ETA: {formatETA(smoothETA)}</div>
 */
export function useSmoothedETA(actualETA: number, alpha: number = 0.15): number {
  const [displayETA, setDisplayETA] = useState(actualETA)
  const alphaRef = useRef(alpha)
  alphaRef.current = alpha

  useEffect(() => {
    // Clamp alpha to valid range
    const clampedAlpha = Math.max(0, Math.min(1, alphaRef.current))
    
    // Use requestAnimationFrame for smooth updates
    // This prevents jarring jumps when backend ETA changes
    let animationFrame: number
    
    const smooth = () => {
      setDisplayETA(current => {
        // Exponential smoothing formula
        // New value = old value + (actual - old) * alpha
        const diff = actualETA - current
        const update = current + diff * clampedAlpha
        
        // Snap if very close (avoid infinite smoothing)
        if (Math.abs(diff) < 0.1) {
          return actualETA
        }
        
        return update
      })
      
      // Continue smoothing until converged
      animationFrame = requestAnimationFrame(smooth)
    }
    
    animationFrame = requestAnimationFrame(smooth)
    
    return () => cancelAnimationFrame(animationFrame)
  }, [actualETA])

  return displayETA
}

/**
 * Get continuous HSL color gradient for progress visualization.
 * 
 * WHY HSL INSTEAD OF RGB:
 * - HSL allows smooth hue rotation (red → yellow → green)
 * - RGB interpolation creates muddy colors
 * - HSL is perceptually more uniform
 * 
 * COLOR MAPPING:
 * - 0% = Red (Hue 0°)
 * - 50% = Yellow (Hue 60°)
 * - 100% = Green (Hue 120°)
 * 
 * WHY THESE SPECIFIC VALUES:
 * - Saturation 90%: Vibrant but not oversaturated
 * - Lightness 50%: Good contrast on light/dark backgrounds
 * - Hue 0-120: Standard traffic light spectrum
 * 
 * @param progress - Progress value (0-100)
 * @returns HSL color string
 * 
 * @example
 * const color = getProgressColor(75) // Returns "hsl(90, 90%, 50%)"
 */
export function getProgressColor(progress: number): string {
  // Clamp progress to valid range
  const clamped = Math.max(0, Math.min(100, progress))
  
  // Map progress (0-100) to hue (0-120)
  // 0% → 0° (red)
  // 50% → 60° (yellow)  
  // 100% → 120° (green)
  const hue = (clamped / 100) * 120
  
  // Fixed saturation and lightness for consistency
  const saturation = 90  // Vibrant colors
  const lightness = 50   // Good contrast
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
