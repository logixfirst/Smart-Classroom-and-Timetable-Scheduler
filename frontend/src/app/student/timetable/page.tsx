'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

function TimetableGrid({ schedule }: { schedule: any[] }) {
  // Lazy-render via IntersectionObserver — defers table DOM until in-viewport
  const wrapRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { rootMargin: '300px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView])

  if (!schedule || schedule.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>No timetable data available</p>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="overflow-x-auto">
      {!inView ? (
        <div style={{ minHeight: '200px' }} />
      ) : (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 dark:border-gray-700 p-2 bg-gray-100 dark:bg-gray-800 text-xs font-medium">Time</th>
            {DAYS.map(day => (
              <th key={day} className="border border-gray-300 dark:border-gray-700 p-2 bg-gray-100 dark:bg-gray-800 text-xs font-medium">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map(time => (
            <tr key={time}>
              <td className="border border-gray-300 dark:border-gray-700 p-2 text-xs font-medium text-gray-600 dark:text-gray-400">{time}</td>
              {DAYS.map(day => {
                const slot = schedule.find(s => s.day === day && s.time_slot?.startsWith(time))
                return (
                  <td key={`${day}-${time}`} className="border border-gray-300 dark:border-gray-700 p-2">
                    {slot ? (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{slot.subject_code}</div>
                        <div className="text-gray-600 dark:text-gray-400">{slot.faculty_name}</div>
                        <div className="text-gray-500 dark:text-gray-500">{slot.room_number}</div>
                      </div>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  )
}

export default function StudentTimetable() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  const SCHEDULE_CACHE_KEY = 'student_schedule_cache'
  const SCHEDULE_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  const [schedule, setSchedule] = useState<any[]>(() => {
    try {
      const raw = sessionStorage.getItem(SCHEDULE_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < SCHEDULE_CACHE_TTL) return data
      }
    } catch { /* storage unavailable */ }
    return []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/timetable/student/me/`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success) {
        setSchedule(data.slots || [])
        setStudent(data.student)
        try {
          sessionStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify({ data: data.slots || [], ts: Date.now() }))
        } catch { /* quota exceeded */ }
      } else {
        setError(data.message || 'Failed to load timetable')
      }
    } catch (error: any) {
      console.error('Failed to fetch schedule:', error)
      setError(error.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <GoogleSpinner size={32} className="mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading schedule...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">⚠️</div>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">Failed to load timetable</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
            <button onClick={fetchSchedule} className="btn-primary">Retry</button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-responsive">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-200 truncate">
              My Timetable
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              View your weekly schedule
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-secondary flex-1 sm:flex-none text-xs sm:text-sm">
              <span className="mr-1 sm:mr-2 text-sm">📤</span>
              Export
            </button>
            <button className="btn-primary flex-1 sm:flex-none text-xs sm:text-sm">
              <span className="mr-1 sm:mr-2 text-sm">📅</span>
              Sync Calendar
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-blue-600 dark:text-blue-400">
                {schedule.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Classes</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400">
                {new Set(schedule.map(s => s.subject_code)).size}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Subjects</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-purple-600 dark:text-purple-400">
                {new Set(schedule.map(s => s.faculty_name)).size}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Faculty</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-orange-600 dark:text-orange-400">
                0
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Conflicts</div>
            </div>
          </div>
        </div>

        {/* Timetable */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Weekly Schedule</h3>
            <p className="card-description">Current semester timetable</p>
          </div>
          <TimetableGrid schedule={schedule} />
        </div>

        {/* Today's Classes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Classes</h3>
            <p className="card-description">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="space-y-3">
            {(() => {
              const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
              const todayClasses = schedule.filter(s => s.day === today).sort((a, b) => {
                const timeA = a.time_slot?.split('-')[0] || '00:00'
                const timeB = b.time_slot?.split('-')[0] || '00:00'
                return timeA.localeCompare(timeB)
              })
              
              if (todayClasses.length === 0) {
                return (
                  <p className="text-sm text-gray-500 text-center py-4">No classes scheduled for today</p>
                )
              }
              
              const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo']
              
              return todayClasses.map((slot, index) => {
                const color = colors[index % colors.length]
                const startTime = slot.time_slot?.split('-')[0] || '00:00'
                return (
                  <div key={index} className={`flex items-center gap-3 p-3 bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800 rounded-lg`}>
                    <div className={`w-12 h-12 bg-${color}-100 dark:bg-${color}-900/40 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-bold text-${color}-800 dark:text-${color}-300`}>{startTime}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {slot.subject_code}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {slot.faculty_name} • {slot.room_number}
                      </p>
                    </div>
                    <div className={`text-xs text-${color}-600 dark:text-${color}-400 font-medium`}>
                      {slot.time_slot}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
