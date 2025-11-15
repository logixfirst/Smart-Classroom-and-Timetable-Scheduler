'use client'

import DashboardLayout from '@/components/dashboard-layout'
import TimetableGrid from '@/components/shared/TimetableGrid'

export default function StudentTimetable() {
  const schedule = [
    {
      day: 'monday',
      time: '9:00-10:00',
      subject: 'Data Structures',
      faculty: 'Dr. Rajesh Kumar',
      classroom: 'Lab 1',
      batch: 'CS-A',
    },
    {
      day: 'wednesday',
      time: '9:00-10:00',
      subject: 'Database Systems',
      faculty: 'Prof. Meera Sharma',
      classroom: 'Room 205',
      batch: 'CS-A',
    },
    {
      day: 'friday',
      time: '9:00-10:00',
      subject: 'Software Engineering',
      faculty: 'Dr. Vikram Gupta',
      classroom: 'Room 301',
      batch: 'CS-A',
    },
    {
      day: 'tuesday',
      time: '11:00-12:00',
      subject: 'Machine Learning',
      faculty: 'Dr. Anita Verma',
      classroom: 'Lab 2',
      batch: 'CS-A',
    },
    {
      day: 'thursday',
      time: '11:00-12:00',
      subject: 'Web Development',
      faculty: 'Prof. Suresh Reddy',
      classroom: 'Lab 3',
      batch: 'CS-A',
    },
    {
      day: 'monday',
      time: '14:00-15:00',
      subject: 'Technical Writing',
      faculty: 'Dr. Kavita Joshi',
      classroom: 'Room 101',
      batch: 'CS-A',
    },
    {
      day: 'wednesday',
      time: '14:00-15:00',
      subject: 'Data Structures',
      faculty: 'Dr. Rajesh Kumar',
      classroom: 'Room 205',
      batch: 'CS-A',
    },
    {
      day: 'friday',
      time: '14:00-15:00',
      subject: 'Database Systems',
      faculty: 'Prof. Meera Sharma',
      classroom: 'Lab 1',
      batch: 'CS-A',
    },
  ]

  return (
    <DashboardLayout role="student">
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
                18
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Classes</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400">
                5
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Subjects</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-purple-600 dark:text-purple-400">
                8
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
            <p className="card-description">Monday, December 16, 2024</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">9:00</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  Data Structures
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Dr. Rajesh Kumar • Lab 1</p>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">1h 30m</div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-green-800 dark:text-green-300">14:00</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  Technical Writing
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Dr. Kavita Joshi • Room 101
                </p>
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">1h 30m</div>
            </div>
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Assignments</h3>
            <p className="card-description">Due dates and submissions</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  Database Design Project
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Prof. Meera Sharma</p>
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                Due in 3 days
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  ML Algorithm Implementation
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Dr. Anita Verma</p>
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 font-medium">Due tomorrow</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
