'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/dashboard-layout'
import TimetableGrid from '@/components/shared/TimetableGrid'
import apiClient from '@/lib/api'

// Lazy load ExportButton to reduce initial bundle size (removes jsPDF, html2canvas, xlsx ~800KB)
const ExportButton = dynamic(() => import('@/components/shared/ExportButton'), {
  ssr: false,
  loading: () => <button className="btn-primary text-xs px-3 py-2">📥 Export</button>
})

interface Subject {
  offering_id: string
  course_code: string
  course_name: string
  credits: number
  department: string | null
  academic_year: string
  semester_type: string
  semester_number: number
  total_enrolled: number
  max_capacity: number | null
  number_of_sections: number
  offering_status: string
}

interface FacultyProfile {
  faculty_id: string
  faculty_code: string
  faculty_name: string
  email: string
  phone: string | null
  department: string | null
  department_code: string | null
  specialization: string | null
  qualification: string | null
  designation: string | null
  max_workload_per_week: number
  is_active: boolean
  assigned_courses: Subject[]
  total_courses: number
}

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
  const router = useRouter()
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null)
  const [mySubjects, setMySubjects] = useState<Subject[]>([])
  const [todaysClasses, setTodaysClasses] = useState<ClassSession[]>([])
  const [mySchedule, setMySchedule] = useState<TimeSlot[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null)
  // REMOVED: showAttendanceModal - attendance feature removed
  const [loading, setLoading] = useState(true)
  const [timetableData, setTimetableData] = useState<any>(null)

  useEffect(() => {
    loadFacultyProfile()
    loadTimetableData()
  }, [])

  const loadFacultyProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/api/faculty/profile/', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load faculty profile: ${response.status}`)
      }
      
      const data: FacultyProfile = await response.json()
      setFacultyProfile(data)
      setMySubjects(data.assigned_courses || [])
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
          students_count: 0, // Student count not available in slot data
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
        // No approved timetable available
        setTodaysClasses([])
        setMySchedule([])
      }
    } catch (error) {
      console.error('Failed to load timetable data:', error)
      setTodaysClasses([])
      setMySchedule([])
    } finally {
      setLoading(false)
    }
  }



  const handleTakeAttendance = (subjectId?: string) => {
    // REMOVED: Attendance system has been removed
    // TODO: Implement alternative functionality if needed
    console.warn('Attendance feature has been removed')
  }

  // REMOVED: closeAttendanceModal - attendance feature removed

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-4 sm:space-y-6">
        {/* Assigned Subjects */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Assigned Subjects</h3>
            <p className="card-description">Subjects assigned to you for teaching</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner w-6 h-6 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading your subjects...</p>
            </div>
          ) : mySubjects.length > 0 ? (
            <div className="space-y-3">
              {mySubjects.map(subject => (
                <div
                  key={subject.offering_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg gap-3"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {subject.course_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {subject.course_code} • {subject.credits} credits
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {subject.total_enrolled} students enrolled • {subject.number_of_sections} section(s) • {subject.semester_type} {subject.academic_year}
                    </p>
                  </div>

                  {/* REMOVED: Attendance button - feature has been removed */}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📚</div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Subjects Assigned
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                You don't have any subjects assigned yet.
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

        {/* Faculty Profile */}
        {facultyProfile && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Faculty Profile</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{facultyProfile.faculty_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Faculty Code</p>
                <p className="font-medium text-gray-900 dark:text-white">{facultyProfile.faculty_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{facultyProfile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                <p className="font-medium text-gray-900 dark:text-white">{facultyProfile.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
                <p className="font-medium text-gray-900 dark:text-white">{facultyProfile.designation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Specialization</p>
                <p className="font-medium text-gray-900 dark:text-white">{facultyProfile.specialization || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {mySubjects.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Assigned Courses</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {mySubjects.reduce((sum, course) => sum + course.number_of_sections, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Sections</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {mySubjects.reduce((sum, course) => sum + course.total_enrolled, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Students</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
              {facultyProfile?.max_workload_per_week || 0}h
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Max Workload/Week</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
