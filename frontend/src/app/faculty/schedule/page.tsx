'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { TimetableGridSkeleton } from '@/components/LoadingSkeletons'

export default function FacultySchedule() {
  const CACHE_KEY = 'faculty_schedule_cache'
  const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  const [schedule, setSchedule] = useState<any[]>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL) return data
      }
    } catch { /* storage unavailable */ }
    return []
  })
  const [loading, setLoading] = useState(true)
  const [faculty, setFaculty] = useState<any>(null)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const res = await apiClient.request('/timetable/faculty/me/')
      if (res.data && res.data.success) {
        setSchedule(res.data.slots)
        setFaculty(res.data.faculty)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: res.data.slots, ts: Date.now() }))
        } catch { /* quota exceeded */ }
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-responsive">
        <TimetableGridSkeleton />
      </div>
    )
  }

  return (
    <div className="space-responsive">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-normal truncate" style={{ color: 'var(--color-text-primary)' }}>
              My Schedule
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {faculty
                ? `${faculty.faculty_name} • ${faculty.department}`
                : 'View your weekly teaching schedule'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-primary flex-1 sm:flex-none text-xs sm:text-sm">
              Export PDF
            </button>
            <button className="btn-secondary flex-1 sm:flex-none text-xs sm:text-sm">
              Print
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
                {schedule.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total Classes</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-success-text)' }}>
                {new Set(schedule.map(s => s.subject_name)).size}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Subjects</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-purple-600 dark:text-purple-400">
                {new Set(schedule.map(s => s.classroom_number)).size}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Classrooms</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-warning-text)' }}>
                0
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Conflicts</div>
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Weekly Teaching Schedule</h3>
            <p className="card-description">Current semester assignments</p>
          </div>
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p>Schedule grid view has been removed</p>
          </div>
        </div>

        {/* All Classes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Classes</h3>
            <p className="card-description">{schedule.length} classes assigned</p>
          </div>
          {schedule.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No classes assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((slot, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{ background: 'var(--color-primary-subtle)', borderColor: 'var(--color-primary-subtle)' }}>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-subtle)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                      {slot.start_time?.substring(0, 5)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {slot.subject_name}
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {slot.day} • {slot.classroom_number}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workload Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Workload Distribution</h3>
              <p className="card-description">Hours per subject</p>
            </div>
            {schedule.length > 0 ? (
              <div className="space-y-4">
                {Array.from(new Set(schedule.map(s => s.subject_name))).map((subject, idx) => {
                  const subjectSlots = schedule.filter(s => s.subject_name === subject)
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500']
                  const percentage = (subjectSlots.length / schedule.length) * 100
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{subject}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                          <div className={`${colors[idx % colors.length]} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{subjectSlots.length} class{subjectSlots.length !== 1 ? 'es' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                No workload data available
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Schedule Summary</h3>
              <p className="card-description">Class distribution across days</p>
            </div>
            {schedule.length > 0 ? (
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                  const dayClasses = schedule.filter(s => s.day === day)
                  if (dayClasses.length === 0) return null
                  return (
                    <div key={day} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-primary-subtle)', borderColor: 'var(--color-border)' }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: 'var(--color-primary)' }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {day}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{dayClasses.length} class{dayClasses.length !== 1 ? 'es' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                No schedule data available
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
