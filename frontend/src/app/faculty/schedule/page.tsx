'use client'

import { useState, useEffect } from 'react'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import DashboardLayout from '@/components/dashboard-layout'

export default function FacultySchedule() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
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
      const res = await fetch(`${API_BASE}/timetable/faculty/me/`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setSchedule(data.slots)
        setFaculty(data.faculty)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.slots, ts: Date.now() }))
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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <GoogleSpinner size={48} className="mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading schedule...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="faculty">
      <div className="space-responsive">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-200 truncate">
              My Schedule
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {faculty
                ? `${faculty.faculty_name} • ${faculty.department}`
                : 'View your weekly teaching schedule'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-primary flex-1 sm:flex-none text-xs sm:text-sm">
              <span className="mr-1 sm:mr-2 text-sm">📄</span>
              Export PDF
            </button>
            <button className="btn-secondary flex-1 sm:flex-none text-xs sm:text-sm">
              <span className="mr-1 sm:mr-2 text-sm">🖨️</span>
              Print
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
                {new Set(schedule.map(s => s.subject_name)).size}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Subjects</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-purple-600 dark:text-purple-400">
                {new Set(schedule.map(s => s.classroom_number)).size}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Classrooms</div>
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
                  className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                      {slot.start_time?.substring(0, 5)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {slot.subject_name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mathematics 101</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">12h</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Physics 201</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">8h</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Lab Sessions</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">4h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Upcoming Events</h3>
              <p className="card-description">Important dates</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    Faculty Meeting
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Tomorrow, 2:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    Exam Schedule Review
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Dec 20, 10:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
