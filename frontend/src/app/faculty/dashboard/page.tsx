'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import TimetableGrid from '@/components/shared/TimetableGrid'
import ExportButton from '@/components/shared/ExportButton'
import apiClient from '@/lib/api'

interface ClassSession {
  id: number
  course_id: number
  course_name: string
  batch: string
  time_slot: string
  classroom: string
  students_count: number
}

interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
}

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
  const [todaysClasses, setTodaysClasses] = useState<ClassSession[]>([])
  const [mySchedule, setMySchedule] = useState<TimeSlot[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timetableData, setTimetableData] = useState<any>(null)

  useEffect(() => {
    loadTimetableData()
  }, [])

  const loadTimetableData = async () => {
    try {
      setLoading(true)

      // Get the latest approved timetable
      const response = await apiClient.getLatestApprovedTimetable()

      if (response.data && response.data.timetables) {
        setTimetableData(response.data)

        // Process timetable data for faculty view
        const allSlots: TimetableSlot[] = []
        response.data.timetables.forEach((timetable: any) => {
          if (timetable.slots) {
            allSlots.push(...timetable.slots)
          }
        })

        // Filter slots for current faculty (for now, show all - would need auth context for real filtering)
        const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const todaysSlots = allSlots.filter(slot =>
          slot.day.toLowerCase().includes(currentDay.slice(0, 3))
        )

        // Convert to today's classes format
        const todaysClassesData: ClassSession[] = todaysSlots.map((slot, index) => ({
          id: index + 1,
          course_id: index + 101,
          course_name: slot.subject_name,
          batch: slot.batch_id,
          time_slot: slot.time_slot,
          classroom: slot.classroom_number,
          students_count: Math.floor(Math.random() * 40) + 20, // Mock student count
        }))

        setTodaysClasses(todaysClassesData)

        // Convert all slots to schedule format
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
        // Fallback to mock data if no approved timetable
        loadMockData()
      }
    } catch (error) {
      console.error('Failed to load timetable data:', error)
      // Fallback to mock data on error
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockData = () => {
    // Fallback mock data
    const mockClasses: ClassSession[] = [
      {
        id: 1,
        course_id: 101,
        course_name: 'Data Structures',
        time_slot: '9:00-10:00',
        classroom: 'Room 101',
        batch: 'CS-A',
        students_count: 30,
      },
      {
        id: 2,
        course_id: 102,
        course_name: 'Algorithms',
        time_slot: '11:00-12:00',
        classroom: 'Room 102',
        batch: 'CS-B',
        students_count: 25,
      },
    ]
    setTodaysClasses(mockClasses)

    const mockSchedule: TimeSlot[] = [
      {
        day: 'Monday',
        time: '9:00-10:00',
        subject: 'Data Structures',
        faculty: 'Dr. Smith',
        classroom: 'Room 101',
        batch: 'CS-A',
      },
      {
        day: 'Tuesday',
        time: '11:00-12:00',
        subject: 'Algorithms',
        faculty: 'Dr. Smith',
        classroom: 'Room 102',
        batch: 'CS-B',
      },
      {
        day: 'Wednesday',
        time: '14:00-15:00',
        subject: 'Database Systems',
        faculty: 'Dr. Smith',
        classroom: 'Lab 1',
        batch: 'CS-A',
      },
    ]
    setMySchedule(mockSchedule)
  }

  // Keep existing methods unchanged
  const loadTodaysClasses = async () => {
    // This method is now replaced by loadTimetableData, keeping for compatibility
  }

  const loadMySchedule = async () => {
    // This method is now replaced by loadTimetableData, keeping for compatibility
  }

  const handleTakeAttendance = (classSession: ClassSession) => {
    setSelectedClass(classSession)
    setShowAttendanceModal(true)
  }

  const closeAttendanceModal = () => {
    setShowAttendanceModal(false)
    setSelectedClass(null)
  }

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
            Faculty Dashboard
          </h1>
        </div>

        {/* Today's Classes for Attendance */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Classes for Attendance</h3>
            <p className="card-description">Mark attendance for your classes scheduled today</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner w-6 h-6 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading today's classes...</p>
            </div>
          ) : todaysClasses.length > 0 ? (
            <div className="space-y-3">
              {todaysClasses.map(classSession => (
                <div
                  key={classSession.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg gap-3"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {classSession.course_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {classSession.batch} • {classSession.time_slot} • {classSession.classroom}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {classSession.students_count} students enrolled
                    </p>
                  </div>

                  <button
                    onClick={() => handleTakeAttendance(classSession)}
                    className="btn-primary w-full sm:w-auto"
                  >
                    📝 Take Attendance
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📅</div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Classes Today
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                You don't have any classes scheduled for today.
              </p>
            </div>
          )}
        </div>

        {/* My Weekly Schedule */}
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="card-title">My Weekly Schedule</h3>
                <p className="card-description">Your personalized teaching timetable</p>
              </div>
              <ExportButton
                slots={mySchedule.map(slot => ({
                  day: slot.day,
                  time_slot: slot.time,
                  subject_name: slot.subject,
                  faculty_name: slot.faculty,
                  classroom_number: slot.classroom,
                  batch_id: slot.batch,
                }))}
                tableElementId="faculty-schedule-grid"
                options={{
                  title: 'Faculty Weekly Schedule',
                  department: 'Faculty',
                  batch: 'Teaching Schedule',
                  academicYear: '2024-25',
                }}
                className="w-full sm:w-auto"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div id="faculty-schedule-grid">
              <TimetableGrid schedule={mySchedule} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {todaysClasses.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Today's Classes</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {mySchedule.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Weekly Classes</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Array.isArray(todaysClasses)
                ? todaysClasses.reduce((sum, cls) => sum + cls.students_count, 0)
                : 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Students</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
              85%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Attendance</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
