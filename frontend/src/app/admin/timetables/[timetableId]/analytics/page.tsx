'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const timetableId = params.timetableId as string

  const [roomUtil, setRoomUtil] = useState<any>(null)
  const [facultyLoad, setFacultyLoad] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [timetableId])

  const fetchData = async () => {
    try {
      const [roomRes, facultyRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/room_utilization/?job_id=${timetableId}&variant_id=0`, { credentials: 'include' }),
        fetch(`${API_BASE}/analytics/faculty_load/?job_id=${timetableId}&variant_id=0`, { credentials: 'include' }),
        fetch(`${API_BASE}/analytics/summary/?job_id=${timetableId}&variant_id=0`, { credentials: 'include' })
      ])

      if (roomRes.ok) setRoomUtil(await roomRes.json())
      if (facultyRes.ok) setFacultyLoad(await facultyRes.json())
      if (summaryRes.ok) setSummary(await summaryRes.json())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUtilColor = (util: number): string => {
    if (util > 70) return 'var(--color-success)'
    if (util > 40) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  const getLoadColor = (status: string): string => {
    if (status === 'overloaded') return 'var(--color-danger)'
    if (status === 'optimal') return 'var(--color-success)'
    return 'var(--color-warning)'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <GoogleSpinner size={48} className="mx-auto" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading analytics…</p>
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Resource Utilization</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Optimize resource allocation with data-driven insights</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total Classes</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{summary.total_entries}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Avg Room Utilization</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>{summary.room_utilization}%</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Avg Faculty Load</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-success-text)' }}>{summary.faculty_avg_load}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Active Resources</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{summary.total_rooms}R / {summary.total_faculty}F</p>
          </div>
        </div>
      )}

      {/* Room Utilization */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Room Utilization Heatmap</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomUtil?.rooms?.slice(0, 12).map((room: any, idx: number) => (
            <div key={idx} className="rounded-lg p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-surface-2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{room.room}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ background: getUtilColor(room.utilization_percentage) }}>
                  {room.utilization_percentage}%
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                <div className="h-2 rounded-full" style={{ width: `${room.utilization_percentage}%`, background: getUtilColor(room.utilization_percentage) }} />
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{room.total_classes} classes</div>
            </div>
          ))}
        </div>
      </div>

      {/* Faculty Load */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Faculty Teaching Load</h2>
        </div>
        <div className="space-y-3">
          {facultyLoad?.faculty?.slice(0, 10).map((faculty: any, idx: number) => (
            <div key={idx} className="rounded-lg p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-surface-2)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{faculty.faculty}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>({faculty.unique_courses} courses)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{faculty.total_classes} classes</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ background: getLoadColor(faculty.load_status) }}>
                    {faculty.load_status}
                  </span>
                </div>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                <div className="h-2 rounded-full" style={{ width: `${Math.min((faculty.total_classes / 25) * 100, 100)}%`, background: getLoadColor(faculty.load_status) }} />
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Courses: {faculty.courses?.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
