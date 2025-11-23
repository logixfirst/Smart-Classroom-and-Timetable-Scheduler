'use client'

import { useState, useEffect } from 'react'

interface ProgressTrackerProps {
  jobId: string
  onComplete: (timetableId: string) => void
}

export default function TimetableProgressTracker({ jobId, onComplete }: ProgressTrackerProps) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('queued')
  const [phase, setPhase] = useState('Initializing...')
  const [eta, setEta] = useState<number | null>(null)

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  useEffect(() => {
    const pollProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/generation-jobs/${jobId}/status/`, {
          credentials: 'include',
        })

        if (res.ok) {
          const data = await res.json()
          setProgress(data.progress || 0)
          setStatus(data.status)
          setPhase(data.phase || data.message || 'Processing...')
          setEta(data.eta_seconds)

          if (data.status === 'completed' && data.timetable_id) {
            onComplete(data.timetable_id)
          } else if (data.status === 'failed') {
            alert(`Generation failed: ${data.error || 'Unknown error'}`)
          }
        }
      } catch (err) {
        console.error('Failed to poll progress:', err)
      }
    }

    const interval = setInterval(pollProgress, 3000)
    pollProgress()

    return () => clearInterval(interval)
  }, [jobId, onComplete])

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

        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    </div>
  )
}
