/**
 * useProgress -- SSE hook for real-time job progress.
 *
 * Single Responsibility: subscribe to a generation job via Server-Sent Events.
 * Pure utility functions (formatETA, getStageDisplayName, fetchProgressSnapshot,
 * crawlStep) have been moved to \@/lib/progressUtils\.
 * Animation hooks (useSmoothProgress, useSmoothedETA) live in their own files.
 */

import { useState, useEffect, useRef } from 'react'

// -- Back-compat re-exports ---------------------------------------------------
// Files that previously imported these from '@/hooks/useProgress' still work.
export { fetchProgressSnapshot, formatETA, getStageDisplayName } from '@/lib/progressUtils'
export { useSmoothProgress }    from './useSmoothProgress'
export { useSmoothedETA }       from './useSmoothedETA'
export type { SmoothProgressConfig } from './useSmoothProgress'

// -- Types --------------------------------------------------------------------

export interface ProgressData {
  job_id: string
  stage: string
  stage_progress: number
  overall_progress: number
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  eta_seconds: number | null
  started_at: number
  last_updated: number
  metadata: Record<string, unknown>
}

interface UseProgressReturn {
  progress:         ProgressData | null
  isConnected:      boolean
  error:            string | null
  reconnectAttempt: number
}

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

// -- Hook ---------------------------------------------------------------------

/**
 * Subscribe to real-time job progress via Server-Sent Events.
 */
export function useProgress(
  jobId:       string | null,
  onComplete?: (data: ProgressData) => void,
  onError?:    (error: string) => void,
): UseProgressReturn {
  const [progress,          setProgress]         = useState<ProgressData | null>(null)
  const [isConnected,       setIsConnected]      = useState(false)
  const [error,             setError]            = useState<string | null>(null)
  const [reconnectAttempt,  setReconnectAttempt] = useState(0)

  const eventSourceRef      = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectCountRef   = useRef(0)

  useEffect(() => {
    if (!jobId) return
    let isMounted = true

    const connect = () => {
      try {
        eventSourceRef.current?.close()
        const url         = \/generation/stream/\/        const eventSource = new EventSource(url, { withCredentials: true })
        eventSourceRef.current = eventSource

        eventSource.addEventListener('connected', () => {
          if (!isMounted) return
          reconnectCountRef.current = 0
          setReconnectAttempt(0)
          setIsConnected(true)
          setError(null)
        })

        eventSource.addEventListener('progress', (event) => {
          if (!isMounted) return
          try {
            setProgress(JSON.parse(event.data) as ProgressData)
          } catch (err) {
            console.error('[SSE] Failed to parse progress:', err)
          }
        })

        eventSource.addEventListener('done', (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)
            if (data.status === 'completed') {
              if (onComplete && progress) onComplete(progress)
            } else {
              const msg = data.status === 'cancelled'
                ? 'Generation was cancelled'
                : 'Generation failed -- check logs for details'
              if (onError) onError(msg)
            }
          } catch {
            if (onError) onError('Unexpected error in generation')
          }
          eventSource.close()
          setIsConnected(false)
        })

        eventSource.addEventListener('error', (event: Event & { data?: string }) => {
          if (!isMounted) return
          try {
            const msg = event.data ? JSON.parse(event.data).message : 'Connection error'
            setError(msg)
            setIsConnected(false)
            if (onError) onError(msg)
          } catch {
            setIsConnected(false)
          }
        })

        eventSource.onerror = () => {
          if (!isMounted) return
          setIsConnected(false)
          const attempt = reconnectCountRef.current + 1
          reconnectCountRef.current = attempt
          setReconnectAttempt(attempt)
          if (attempt <= 5) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10_000)
            reconnectTimeoutRef.current = setTimeout(() => { if (isMounted) connect() }, delay)
          } else {
            setError('Failed to connect after multiple attempts')
            if (onError) onError('Connection failed')
          }
        }
      } catch (err) {
        console.error('[SSE] Failed to create connection:', err)
        setError('Failed to establish SSE connection')
        setIsConnected(false)
      }
    }

    reconnectCountRef.current = 0
    connect()

    return () => {
      isMounted = false
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [jobId])

  return { progress, isConnected, error, reconnectAttempt }
}
