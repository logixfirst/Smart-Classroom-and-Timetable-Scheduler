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

  const SEVERITY_STYLES: Record<string, { border: string; badge: string }> = {
    critical: { border: 'var(--color-danger)',  badge: 'var(--color-danger)'  },
    high:     { border: '#ea580c',              badge: '#ea580c'              },
    medium:   { border: 'var(--color-warning)', badge: 'var(--color-warning)' },
    low:      { border: 'var(--color-primary)', badge: 'var(--color-primary)' },
  }
  const getSeverityStyle = (s: string) => SEVERITY_STYLES[s] ?? { border: 'var(--color-border)', badge: 'var(--color-bg-surface-3)' }

  const filteredConflicts = conflicts.filter(c => filter === 'all' || c.severity === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <GoogleSpinner size={48} className="mx-auto" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading conflicts…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Conflict Detection</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Identify and resolve timetable conflicts</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {([
            { label: 'Total',    value: summary.total,    color: 'var(--color-text-primary)'   },
            { label: 'Critical', value: summary.critical, color: 'var(--color-danger-text)'    },
            { label: 'High',     value: summary.high,     color: '#ea580c'                     },
            { label: 'Medium',   value: summary.medium,   color: 'var(--color-warning-text)'   },
            { label: 'Low',      value: summary.low,      color: 'var(--color-primary)'        },
          ] as const).map(({ label, value, color }) => (
            <div key={label} className="card">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="card py-3">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all',      label: `All (${conflicts.length})` },
            { key: 'critical', label: `Critical (${summary?.critical ?? 0})` },
            { key: 'high',     label: `High (${summary?.high ?? 0})` },
            { key: 'medium',   label: `Medium (${summary?.medium ?? 0})` },
            { key: 'low',      label: `Low (${summary?.low ?? 0})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={filter === key ? 'btn-primary text-sm py-1.5 px-3' : 'btn-secondary text-sm py-1.5 px-3'}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict list */}
      <div className="space-y-4">
        {filteredConflicts.length === 0 ? (
          <div className="card py-12 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-success-subtle)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No Conflicts Found</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>The timetable has no conflicts at this severity level.</p>
          </div>
        ) : (
          filteredConflicts.map((conflict, idx) => {
            const s = getSeverityStyle(conflict.severity)
            return (
              <div key={idx} className="card overflow-hidden" style={{ borderLeft: `4px solid ${s.border}` }}>
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge text-xs font-semibold text-white" style={{ background: s.badge }}>
                      {conflict.severity.toUpperCase()}
                    </span>
                    <span className="badge badge-neutral text-xs">
                      {conflict.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {conflict.day} · {conflict.time_slot}
                  </span>
                </div>

                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>{conflict.message}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                  {conflict.faculty && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Faculty: </span>
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{conflict.faculty}</span>
                    </div>
                  )}
                  {conflict.room && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Room: </span>
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{conflict.room}</span>
                    </div>
                  )}
                  {conflict.courses && (
                    <div className="sm:col-span-2">
                      <span style={{ color: 'var(--color-text-muted)' }}>Courses: </span>
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{conflict.courses.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg p-4" style={{ background: 'var(--color-info-subtle)', border: '1px solid var(--color-primary)' }}>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-primary)' }}>Suggested Resolution</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{conflict.suggestion}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
