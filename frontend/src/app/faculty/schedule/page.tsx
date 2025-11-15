'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function FacultySchedule() {
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
              View your weekly teaching schedule
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
                24
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Weekly Hours</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400">
                3
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Subjects</div>
            </div>
          </div>
          <div className="card-compact">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-purple-600 dark:text-purple-400">
                5
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
                  Mathematics 101
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">CS-A • Room 201</p>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">1h</div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-green-800 dark:text-green-300">11:00</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  Physics 201
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">CS-C • Lab 1</p>
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">1h</div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                  14:00
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  Lab Session
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">CS-A • Lab 2</p>
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">1h</div>
            </div>
          </div>
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
