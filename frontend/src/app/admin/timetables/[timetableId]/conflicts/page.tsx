'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface Conflict {
  type: string
  severity: string
  day: string
  time_slot: string
  message: string
  suggestion: string
  faculty?: string
  room?: string
  courses?: string[]
}

export default function ConflictsPage() {
  const params = useParams()
  const router = useRouter()
  const timetableId = params.timetableId as string

  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchConflicts()
  }, [timetableId])

  const fetchConflicts = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/conflicts/detect/?job_id=${timetableId}&variant_id=0`,
        { credentials: 'include' }
      )
      
      if (response.ok) {
        const data = await response.json()
        setConflicts(data.conflicts || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Failed to fetch conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500'
      case 'high': return 'border-orange-500'
      case 'medium': return 'border-yellow-500'
      case 'low': return 'border-blue-500'
      default: return 'border-gray-500'
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    }
    return colors[severity as keyof typeof colors] || 'bg-gray-500'
  }

  const filteredConflicts = conflicts.filter(c => 
    filter === 'all' || c.severity === filter
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <GoogleSpinner size={48} className="mx-auto" />
            <p className="mt-4 text-gray-600">Loading conflicts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 mb-4">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Conflict Detection Dashboard</h1>
          <p className="text-gray-600 mt-2">Identify and resolve timetable conflicts</p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
              <div className="text-sm text-gray-600">Total Conflicts</div>
              <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="text-sm text-gray-600">Critical</div>
              <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="text-sm text-gray-600">High</div>
              <div className="text-2xl font-bold text-orange-600">{summary.high}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="text-sm text-gray-600">Medium</div>
              <div className="text-2xl font-bold text-yellow-600">{summary.medium}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Low</div>
              <div className="text-2xl font-bold text-blue-600">{summary.low}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              All ({conflicts.length})
            </button>
            <button onClick={() => setFilter('critical')} className={`px-4 py-2 rounded ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              Critical ({summary?.critical || 0})
            </button>
            <button onClick={() => setFilter('high')} className={`px-4 py-2 rounded ${filter === 'high' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              High ({summary?.high || 0})
            </button>
            <button onClick={() => setFilter('medium')} className={`px-4 py-2 rounded ${filter === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              Medium ({summary?.medium || 0})
            </button>
            <button onClick={() => setFilter('low')} className={`px-4 py-2 rounded ${filter === 'low' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              Low ({summary?.low || 0})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredConflicts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Conflicts Found</h3>
              <p className="text-gray-600">The timetable has no conflicts at this severity level.</p>
            </div>
          ) : (
            filteredConflicts.map((conflict, idx) => (
              <div key={idx} className={`bg-white rounded-lg shadow border-l-4 ${getSeverityColor(conflict.severity)} p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getSeverityBadge(conflict.severity)}`}>
                      {conflict.severity.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                      {conflict.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {conflict.day} • {conflict.time_slot}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{conflict.message}</h3>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  {conflict.faculty && (
                    <div>
                      <span className="text-gray-600">Faculty:</span>
                      <span className="ml-2 font-medium text-gray-900">{conflict.faculty}</span>
                    </div>
                  )}
                  {conflict.room && (
                    <div>
                      <span className="text-gray-600">Room:</span>
                      <span className="ml-2 font-medium text-gray-900">{conflict.room}</span>
                    </div>
                  )}
                  {conflict.courses && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Courses:</span>
                      <span className="ml-2 font-medium text-gray-900">{conflict.courses.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 text-xl">💡</span>
                    <div>
                      <div className="font-semibold text-blue-900 mb-1">Suggested Resolution</div>
                      <div className="text-sm text-blue-800">{conflict.suggestion}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
