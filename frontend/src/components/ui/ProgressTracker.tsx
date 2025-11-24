'use client'

import { useState, useEffect, useRef } from 'react'

interface ProgressTrackerProps {
  jobId: string
  onComplete: (timetableId: string) => void
  onCancel?: () => void
}

export default function TimetableProgressTracker({ jobId, onComplete, onCancel }: ProgressTrackerProps) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('queued')
  const [phase, setPhase] = useState('Initializing...')
  const [eta, setEta] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'
  const WS_BASE = process.env.NEXT_PUBLIC_FASTAPI_WS_URL || 'ws://localhost:8001'

  useEffect(() => {
    let isConnected = false

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${WS_BASE}/ws/progress/${jobId}`)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('WebSocket connected')
          isConnected = true
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            setProgress(data.progress || 0)
            setStatus(data.status || 'running')
            setPhase(data.phase || data.message || 'Processing...')
            setEta(data.eta_seconds)

            if (data.status === 'completed' && data.timetable_id) {
              onComplete(data.timetable_id)
              ws.close()
            } else if (data.status === 'failed') {
              alert(`Generation failed: ${data.error || 'Unknown error'}`)
              ws.close()
            } else if (data.status === 'cancelled') {
              ws.close()
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        ws.onclose = () => {
          console.log('WebSocket disconnected')
          isConnected = false
          
          // Reconnect after 3 seconds if not completed/failed
          if (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Reconnecting WebSocket...')
              connectWebSocket()
            }, 3000)
          }
        }
      } catch (err) {
        console.error('Failed to connect WebSocket:', err)
        // Fallback to polling if WebSocket fails
        startPolling()
      }
    }

    const startPolling = () => {
      const pollProgress = async () => {
        try {
          const res = await fetch(`${API_BASE}/progress/${jobId}/`, {
            credentials: 'include',
          })

          if (res.ok) {
            const data = await res.json()
            setProgress(data.progress || 0)
            setStatus(data.status || 'running')
            setPhase(data.stage || data.message || 'Processing...')

            if (data.status === 'completed') {
              onComplete(jobId)
            } else if (data.status === 'failed') {
              alert(`Generation failed: ${data.message || 'Unknown error'}`)
            }
          }
        } catch (err) {
          console.error('Failed to poll progress:', err)
        }
      }

      const interval = setInterval(pollProgress, 2000)
      pollProgress()

      return () => clearInterval(interval)
    }

    // Try WebSocket first, fallback to polling
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [jobId, onComplete, status])

  const handleCancel = async () => {
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

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Generating Timetable</h3>
          <p className="text-sm text-gray-600">{phase}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{status}</span>
            <span className="text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {eta && (
          <p className="text-center text-sm text-gray-500">
            Estimated time remaining: {Math.ceil(eta / 60)} minutes
          </p>
        )}

        <div className="flex justify-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>

        <div className="flex justify-center gap-4">
          <a
            href="/admin/timetables"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Timetables
          </a>
          
          {status !== 'completed' && status !== 'failed' && status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Generation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
