'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'
import { AssignedSubjectsCard } from './_components/AssignedSubjectsCard'
import { WeeklyScheduleCard } from './_components/WeeklyScheduleCard'
import { FacultyProfileCard } from './_components/FacultyProfileCard'
import { FacultyQuickStats } from './_components/FacultyQuickStats'
import type { Subject } from './_components/AssignedSubjectsCard'
import type { FacultyProfile } from './_components/FacultyProfileCard'
import type { TimeSlot } from './_components/WeeklyScheduleCard'

interface TimetableSlot {
  slot_id: string
  day: string
  time_slot: string
  subject_name: string
  faculty_name: string
  classroom_number: string
  batch_id: string
}

export default function FacultyDashboard() {
  const router = useRouter()
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  const PROFILE_CACHE_KEY = 'faculty_profile_cache'
  const PROFILE_CACHE_TTL = 5 * 60 * 1000

  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < PROFILE_CACHE_TTL) return data
      }
    } catch { /* storage unavailable */ }
    return null
  })
  const [mySubjects, setMySubjects] = useState<Subject[]>(() => {
    try {
      const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < PROFILE_CACHE_TTL) return data?.assigned_courses || []
      }
    } catch { /* storage unavailable */ }
    return []
  })
  const [mySchedule, setMySchedule] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadFacultyProfile(), loadTimetableData()]).catch(() => {})
  }, [])

  const loadFacultyProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/faculty/profile/`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error(`Failed to load faculty profile: ${response.status}`)
      const data: FacultyProfile = await response.json()
      setFacultyProfile(data)
      setMySubjects(data.assigned_courses || [])
      try {
        sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
      } catch { /* quota exceeded */ }
    } catch (error) {
      console.error('Failed to load faculty profile:', error)
      setMySubjects([])
    } finally {
      setLoading(false)
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
        const scheduleData: TimeSlot[] = allSlots.map(slot => ({
          day: slot.day,
          time: slot.time_slot,
          subject: slot.subject_name,
          faculty: slot.faculty_name,
          classroom: slot.classroom_number,
          batch: slot.batch_id,
        }))
        setMySchedule(scheduleData)
      } else {
        setMySchedule([])
      }
    } catch (error) {
      console.error('Failed to load timetable data:', error)
      setMySchedule([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <AssignedSubjectsCard subjects={mySubjects} loading={loading} />
      <WeeklyScheduleCard schedule={mySchedule} />
      {facultyProfile && <FacultyProfileCard profile={facultyProfile} />}
      <FacultyQuickStats
        subjects={mySubjects}
        maxWorkloadPerWeek={facultyProfile?.max_workload_per_week ?? 0}
      />
    </div>
  )
}
