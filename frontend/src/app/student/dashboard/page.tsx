'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { StudentWelcomeCard } from './components/StudentWelcomeCard'
import { TodaysClassesCard } from './components/TodaysClassesCard'
import { EnrollmentCard } from './components/EnrollmentCard'
import { AcademicSidePanel } from './components/AcademicSidePanel'
import { AssignmentsPanel, NotificationsPanel, CourseMaterialsPanel } from './components/BottomPanels'
import { ClashDetectionCard } from './components/ClashDetectionCard'
import type { StudentProfile, TodayClass } from './components/types'

interface TimetableSlot {
  slot_id: string
  day: string
  time_slot: string
  subject_name: string
  faculty_name: string
  classroom_number: string
  batch_id: string
}

export default function StudentDashboard() {
  const PROFILE_CACHE_KEY = 'student_profile_cache'
  const PROFILE_CACHE_TTL = 5 * 60 * 1000

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < PROFILE_CACHE_TTL) return data
      }
    } catch { /* storage unavailable */ }
    return null
  })
  const [todaysClasses, setTodaysClasses] = useState<TodayClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadStudentProfile(), loadTimetableData()]).catch(() => {})
  }, [])

  const loadStudentProfile = async () => {
    try {
      const response = await apiClient.request('/student/profile/')
      if (response.data) {
        setStudentProfile(response.data)
        try {
          sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ data: response.data, ts: Date.now() }))
        } catch { /* quota exceeded */ }
      }
    } catch (error) {
      console.error('Failed to load student profile:', error)
    }
  }

  const loadTimetableData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getLatestApprovedTimetable()
      if (response.data && response.data.timetables) {
        const allSlots: TimetableSlot[] = []
        response.data.timetables.forEach((timetable: { slots?: TimetableSlot[] }) => {
          if (timetable.slots) allSlots.push(...timetable.slots)
        })
        const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const todaysSlots = allSlots.filter(slot =>
          slot.day.toLowerCase().includes(currentDay.slice(0, 3))
        )
        const now = new Date()
        const currentHour = now.getHours()
        const todaysClassesData: TodayClass[] = todaysSlots.map(slot => {
          const [startTime] = slot.time_slot.split('-')
          const [hour] = startTime.split(':').map(Number)
          let status: 'upcoming' | 'current' | 'completed' = 'upcoming'
          if (hour < currentHour) status = 'completed'
          else if (hour === currentHour) status = 'current'
          return {
            time: slot.time_slot,
            subject: slot.subject_name,
            code: '',
            faculty: slot.faculty_name,
            room: slot.classroom_number,
            status,
            type: 'Lecture',
          }
        })
        setTodaysClasses(todaysClassesData)
      } else {
        setTodaysClasses([])
      }
    } catch (error) {
      console.error('Failed to load timetable data:', error)
      setTodaysClasses([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <StudentWelcomeCard studentProfile={studentProfile} />

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
          <button
            onClick={() => window.location.href = '/student/timetable'}
            className="btn-secondary flex items-center justify-center p-4 h-20 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="font-medium text-center">View Timetable</span>
          </button>
          <button
            className="btn-secondary flex items-center justify-center p-4 h-20 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="font-medium text-center">Export Schedule</span>
          </button>
          <button
            className="btn-secondary flex items-center justify-center p-4 h-20 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="font-medium text-center">My Courses</span>
          </button>
        </div>
      </div>

      {/* Today's Schedule + Academic Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2 space-y-4 md:space-y-6">
          <TodaysClassesCard todaysClasses={todaysClasses} loading={loading} />
          <EnrollmentCard studentProfile={studentProfile} />
        </div>
        <AcademicSidePanel studentProfile={studentProfile} />
      </div>

      {/* Assignments, Notifications & Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <AssignmentsPanel />
        <NotificationsPanel />
        <CourseMaterialsPanel />
      </div>

      <ClashDetectionCard />
    </div>
  )
}
