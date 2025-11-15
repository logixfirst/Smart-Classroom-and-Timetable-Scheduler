'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import ExportButton from '@/components/shared/ExportButton'
import apiClient from '@/lib/api'

interface TodayClass {
  time: string
  subject: string
  code: string
  faculty: string
  room: string
  status: 'upcoming' | 'current' | 'completed'
  type: string
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

export default function StudentDashboard() {
  const [todaysClasses, setTodaysClasses] = useState<TodayClass[]>([])
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

        // Process timetable data for student view
        const allSlots: TimetableSlot[] = []
        response.data.timetables.forEach((timetable: any) => {
          if (timetable.slots) {
            allSlots.push(...timetable.slots)
          }
        })

        // Filter slots for current day
        const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const todaysSlots = allSlots.filter(slot =>
          slot.day.toLowerCase().includes(currentDay.slice(0, 3))
        )

        // Convert to today's classes format with realistic status
        const now = new Date()
        const currentHour = now.getHours()

        const todaysClassesData: TodayClass[] = todaysSlots.map((slot, index) => {
          // Parse time slot to determine status
          const [startTime] = slot.time_slot.split('-')
          const [hour] = startTime.split(':').map(Number)

          let status: 'upcoming' | 'current' | 'completed' = 'upcoming'
          if (hour < currentHour) {
            status = 'completed'
          } else if (hour === currentHour) {
            status = 'current'
          }

          return {
            time: slot.time_slot,
            subject: slot.subject_name,
            code: `CS${300 + index}`, // Mock course code
            faculty: slot.faculty_name,
            room: slot.classroom_number,
            status,
            type: index % 3 === 0 ? 'Lab' : index % 3 === 1 ? 'Lecture' : 'Tutorial',
          }
        })

        setTodaysClasses(todaysClassesData)
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
    const mockClasses: TodayClass[] = [
      {
        time: '09:00 - 10:30',
        subject: 'Data Structures',
        code: 'CS301',
        faculty: 'Dr. Rajesh Kumar',
        room: 'Lab 1',
        status: 'upcoming',
        type: 'Lab',
      },
      {
        time: '11:00 - 12:30',
        subject: 'Database Systems',
        code: 'CS302',
        faculty: 'Prof. Meera Sharma',
        room: 'Room 205',
        status: 'current',
        type: 'Lecture',
      },
      {
        time: '14:00 - 15:30',
        subject: 'Software Engineering',
        code: 'CS303',
        faculty: 'Dr. Vikram Gupta',
        room: 'Room 301',
        status: 'upcoming',
        type: 'Tutorial',
      },
    ]
    setTodaysClasses(mockClasses)
  }
  return (
    <DashboardLayout role="student">
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="card">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
                  Welcome back, Arjun Singh
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
                  Computer Science Engineering • Semester 5 • Roll: CSE21001
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button className="btn-primary text-xs sm:text-sm px-4 py-3">
                  <span className="mr-1 sm:mr-2 text-lg">📅</span>
                  <span className="hidden sm:inline">View Timetable</span>
                  <span className="sm:hidden">Schedule</span>
                </button>
                <button className="btn-secondary text-xs sm:text-sm px-4 py-3">
                  <span className="mr-1 sm:mr-2 text-lg">📚</span>
                  <span className="hidden sm:inline">My Courses</span>
                  <span className="sm:hidden">Courses</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4">
            {[
              { icon: '📅', label: 'Timetable', sublabel: 'View Schedule' },
              { icon: '📝', label: 'Exams', sublabel: 'Schedule' },
              { icon: '📋', label: 'Assignments', sublabel: 'Due Soon' },
              { icon: '📊', label: 'Grades', sublabel: 'View Results' },
              { icon: '📚', label: 'Materials', sublabel: 'Download' },
              { icon: '💬', label: 'Feedback', sublabel: 'Anonymous' },
              { icon: '🔍', label: 'Clash Check', sublabel: 'Courses' },
              { icon: '📤', label: 'Export', sublabel: 'Calendar' },
            ].map((action, index) => (
              <button
                key={index}
                className="btn-secondary flex flex-col items-center justify-center p-3 h-16 sm:h-20 text-xs"
              >
                <span className="text-lg sm:text-2xl mb-1">{action.icon}</span>
                <span className="font-medium text-center leading-tight">{action.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center hidden sm:block">
                  {action.sublabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Schedule & Course Registration */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <div className="xl:col-span-2 space-y-4 md:space-y-6">
            {/* Today's Classes */}
            <div className="card">
              <div className="card-header">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="card-title">Today's Classes</h3>
                    <p className="card-description">Monday, March 18, 2024</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs px-3 py-2">
                      <span className="mr-1">📅</span>
                      <span className="hidden sm:inline">Calendar View</span>
                      <span className="sm:hidden">Calendar</span>
                    </button>
                    <ExportButton
                      slots={todaysClasses.map(cls => ({
                        day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                        time_slot: cls.time,
                        subject_name: cls.subject,
                        faculty_name: cls.faculty,
                        classroom_number: cls.room,
                        batch_id: 'CS-A', // Could be dynamic based on student data
                      }))}
                      tableElementId="student-schedule-grid"
                      options={{
                        title: 'Student Timetable',
                        department: 'Computer Science',
                        batch: 'CS-A',
                        semester: 5,
                        academicYear: '2024-25',
                      }}
                      className="text-xs px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading today's schedule...</p>
                  </div>
                </div>
              ) : todaysClasses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                    No Classes Today
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">Enjoy your free day!</p>
                </div>
              ) : (
                <div id="student-schedule-grid" className="space-y-3">
                  {todaysClasses.map((class_, index) => (
                    <div
                      key={index}
                      className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                        class_.status === 'current'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                          : 'bg-gray-50 dark:bg-[#3c4043] border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200 truncate">
                              {class_.subject}
                            </h4>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              ({class_.code})
                            </span>
                            <span
                              className={`badge text-xs ${
                                class_.type === 'Lab'
                                  ? 'badge-info'
                                  : class_.type === 'Tutorial'
                                    ? 'badge-warning'
                                    : 'badge-neutral'
                              }`}
                            >
                              {class_.type}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {class_.faculty} • {class_.room}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {class_.time}
                          </p>
                          <span
                            className={`badge text-xs ${
                              class_.status === 'current' ? 'badge-success' : 'badge-neutral'
                            }`}
                          >
                            {class_.status === 'current' ? 'In Progress' : 'Upcoming'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Course Registration/Enrollment */}
            <div className="card">
              <div className="card-header">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="card-title">Current Enrollment</h3>
                    <p className="card-description">Semester 5 • 24 Credits</p>
                  </div>
                  <button className="btn-primary text-xs px-3 py-2 w-full sm:w-auto">
                    <span className="mr-1">🔍</span>
                    Check Clashes
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Course</th>
                      <th className="table-header-cell hidden sm:table-cell">Code</th>
                      <th className="table-header-cell">Credits</th>
                      <th className="table-header-cell hidden md:table-cell">Faculty</th>
                      <th className="table-header-cell">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        name: 'Data Structures',
                        code: 'CS301',
                        credits: 4,
                        faculty: 'Dr. Rajesh Kumar',
                        type: 'Core',
                      },
                      {
                        name: 'Database Systems',
                        code: 'CS302',
                        credits: 4,
                        faculty: 'Prof. Meera Sharma',
                        type: 'Core',
                      },
                      {
                        name: 'Software Engineering',
                        code: 'CS303',
                        credits: 4,
                        faculty: 'Dr. Vikram Gupta',
                        type: 'Core',
                      },
                      {
                        name: 'Machine Learning',
                        code: 'CS401',
                        credits: 4,
                        faculty: 'Dr. Anita Verma',
                        type: 'Elective',
                      },
                      {
                        name: 'Web Development',
                        code: 'CS402',
                        credits: 4,
                        faculty: 'Prof. Suresh Reddy',
                        type: 'Elective',
                      },
                      {
                        name: 'Technical Writing',
                        code: 'EN301',
                        credits: 4,
                        faculty: 'Dr. Kavita Joshi',
                        type: 'General',
                      },
                    ].map((course, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell">{course.name}</td>
                        <td className="table-cell hidden sm:table-cell">{course.code}</td>
                        <td className="table-cell">{course.credits}</td>
                        <td className="table-cell hidden md:table-cell">{course.faculty}</td>
                        <td className="table-cell">
                          <span
                            className={`badge text-xs ${
                              course.type === 'Core'
                                ? 'badge-primary'
                                : course.type === 'Elective'
                                  ? 'badge-info'
                                  : 'badge-neutral'
                            }`}
                          >
                            {course.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-4 md:space-y-6">
            {/* Academic Progress */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Academic Progress</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current CGPA</span>
                    <span className="font-semibold text-sm sm:text-base text-[#34a853]">8.7</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[#34a853] h-2 rounded-full transition-all duration-300"
                      style={{ width: '87%' }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
                  <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                    <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
                      6
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Courses</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                    <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
                      24
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Credits</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Attendance Overview</h3>
              </div>
              <div className="space-y-3">
                {[
                  {
                    subject: 'Data Structures',
                    code: 'CS301',
                    attendance: 92,
                    classes: 25,
                    required: 75,
                  },
                  {
                    subject: 'Database Systems',
                    code: 'CS302',
                    attendance: 88,
                    classes: 22,
                    required: 75,
                  },
                  {
                    subject: 'Software Engineering',
                    code: 'CS303',
                    attendance: 95,
                    classes: 20,
                    required: 75,
                  },
                  {
                    subject: 'Machine Learning',
                    code: 'CS401',
                    attendance: 73,
                    classes: 18,
                    required: 75,
                  },
                ].map((course, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate block">
                          {course.subject}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {course.code} • {course.classes} classes
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            course.attendance >= 90
                              ? 'text-green-600'
                              : course.attendance >= course.required
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {course.attendance}%
                        </span>
                        {course.attendance < course.required && (
                          <p className="text-xs text-red-500">Below {course.required}%</p>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          course.attendance >= 90
                            ? 'bg-green-600'
                            : course.attendance >= course.required
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                        }`}
                        style={{ width: `${course.attendance}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exam Schedule */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Upcoming Exams</h3>
              </div>
              <div className="space-y-3">
                {[
                  {
                    subject: 'Database Systems',
                    type: 'Mid-term',
                    date: 'Mar 25',
                    time: '10:00 AM',
                    room: 'Hall A',
                  },
                  {
                    subject: 'Data Structures',
                    type: 'Quiz',
                    date: 'Mar 28',
                    time: '2:00 PM',
                    room: 'Lab 1',
                  },
                  {
                    subject: 'Software Engineering',
                    type: 'Mid-term',
                    date: 'Apr 2',
                    time: '9:00 AM',
                    room: 'Hall B',
                  },
                ].map((exam, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {exam.subject}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {exam.type} • {exam.room}
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {exam.date}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{exam.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Assignments, Notifications & Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm sm:text-base">Upcoming Assignments</h3>
              <p className="card-description text-xs sm:text-sm">Deadlines and submissions</p>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: 'Database Design Project',
                  subject: 'Database Systems',
                  code: 'CS302',
                  due: 'March 22, 2024',
                  priority: 'high',
                  submitted: false,
                },
                {
                  title: 'Algorithm Analysis Report',
                  subject: 'Data Structures',
                  code: 'CS301',
                  due: 'March 25, 2024',
                  priority: 'medium',
                  submitted: false,
                },
                {
                  title: 'Software Requirements Document',
                  subject: 'Software Engineering',
                  code: 'CS303',
                  due: 'March 28, 2024',
                  priority: 'low',
                  submitted: true,
                },
                {
                  title: 'ML Model Implementation',
                  subject: 'Machine Learning',
                  code: 'CS401',
                  due: 'April 5, 2024',
                  priority: 'medium',
                  submitted: false,
                },
              ].map((assignment, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                        assignment.submitted
                          ? 'bg-green-500'
                          : assignment.priority === 'high'
                            ? 'bg-red-500'
                            : assignment.priority === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                        {assignment.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {assignment.subject} ({assignment.code})
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Due: {assignment.due}
                        </p>
                        <span
                          className={`badge text-xs ${
                            assignment.submitted ? 'badge-success' : 'badge-warning'
                          }`}
                        >
                          {assignment.submitted ? 'Submitted' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm sm:text-base">Notifications</h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  type: 'announcement',
                  message: 'Mid-semester exam schedule released',
                  time: '2h ago',
                  priority: 'high',
                },
                {
                  type: 'grade',
                  message: 'Grade updated for Database Systems Quiz',
                  time: '1d ago',
                  priority: 'medium',
                },
                {
                  type: 'event',
                  message: 'Technical fest registration open',
                  time: '2d ago',
                  priority: 'low',
                },
                {
                  type: 'alert',
                  message: 'Class cancelled: Software Engineering Lab',
                  time: '3h ago',
                  priority: 'high',
                },
                {
                  type: 'material',
                  message: 'New lecture notes uploaded for ML',
                  time: '1d ago',
                  priority: 'medium',
                },
              ].map((notification, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    notification.priority === 'high'
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                      : notification.priority === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500'
                        : 'bg-gray-50 dark:bg-[#3c4043] border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-sm flex-shrink-0">
                      {notification.type === 'announcement'
                        ? '📢'
                        : notification.type === 'grade'
                          ? '📊'
                          : notification.type === 'alert'
                            ? '⚠️'
                            : notification.type === 'material'
                              ? '📚'
                              : '🎉'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card lg:col-span-2 xl:col-span-1">
            <div className="card-header">
              <h3 className="card-title text-sm sm:text-base">Course Materials & Feedback</h3>
            </div>
            <div className="space-y-4">
              {/* Course Materials */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Recent Materials
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      title: 'Database Normalization Notes',
                      course: 'CS302',
                      type: 'PDF',
                      size: '2.4 MB',
                    },
                    {
                      title: 'Algorithm Complexity Slides',
                      course: 'CS301',
                      type: 'PPT',
                      size: '5.1 MB',
                    },
                    {
                      title: 'Software Testing Guidelines',
                      course: 'CS303',
                      type: 'DOC',
                      size: '1.8 MB',
                    },
                  ].map((material, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-[#3c4043] rounded-lg"
                    >
                      <div className="text-sm flex-shrink-0">
                        {material.type === 'PDF' ? '📝' : material.type === 'PPT' ? '📊' : '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                          {material.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {material.course} • {material.size}
                        </p>
                      </div>
                      <button className="btn-secondary text-xs px-2 py-1 h-6 flex-shrink-0">
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anonymous Feedback */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Anonymous Feedback
                </h4>
                <div className="space-y-2">
                  <button className="w-full p-3 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg text-left hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💬</span>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-primary-700 dark:text-primary-300">
                          Course Scheduling Feedback
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400">
                          Share your thoughts on timetable conflicts
                        </p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-3 bg-gray-50 dark:bg-[#3c4043] border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-[#f5f5f5] dark:hover:bg-[#5f6368] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⭐</span>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                          Faculty Performance
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Rate teaching quality and methods
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Clash Detection Tool */}
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="card-title text-sm sm:text-base">Course Clash Detection</h3>
                <p className="card-description text-xs sm:text-sm">
                  Check for scheduling conflicts in your course selection
                </p>
              </div>
              <button className="btn-primary text-xs sm:text-sm px-3 py-2 h-8 sm:h-10 w-full sm:w-auto">
                <span className="mr-1 sm:mr-2">🔍</span>
                Run Clash Check
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                Current Conflicts
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-sm flex-shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">
                        Time Conflict Detected
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Machine Learning (CS401) overlaps with Web Development (CS402)
                      </p>
                      <p className="text-xs text-red-500 dark:text-red-500">Monday 2:00-3:30 PM</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-sm flex-shrink-0">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                        No Conflicts
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Core courses are properly scheduled
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                Alternative Options
              </h4>
              <div className="space-y-2">
                {[
                  {
                    course: 'Web Development',
                    code: 'CS402',
                    section: 'B',
                    time: 'Tuesday 10:00-11:30 AM',
                    available: true,
                  },
                  {
                    course: 'Machine Learning',
                    code: 'CS401',
                    section: 'C',
                    time: 'Wednesday 2:00-3:30 PM',
                    available: false,
                  },
                  {
                    course: 'Mobile App Development',
                    code: 'CS403',
                    section: 'A',
                    time: 'Thursday 11:00-12:30 PM',
                    available: true,
                  },
                ].map((option, index) => (
                  <div
                    key={index}
                    className={`p-2 sm:p-3 rounded-lg border ${
                      option.available
                        ? 'bg-gray-50 dark:bg-[#3c4043] border-gray-200 dark:border-gray-700'
                        : 'bg-gray-100 dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-600 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                          {option.course}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {option.code} Section {option.section}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{option.time}</p>
                      </div>
                      <span
                        className={`badge text-xs ${
                          option.available ? 'badge-success' : 'badge-neutral'
                        }`}
                      >
                        {option.available ? 'Available' : 'Full'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
