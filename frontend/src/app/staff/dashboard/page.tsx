'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function StaffDashboard() {
  return (
    <DashboardLayout role="staff">
      <div className="space-y-4 md:space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
          <button className="btn-primary btn-primary-light dark:btn-primary-dark flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">📅</span>
            <span className="hidden sm:inline">Book Room</span>
            <span className="sm:hidden">Book</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">👥</span>
            <span className="hidden sm:inline">Workload</span>
            <span className="sm:hidden">Load</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">✅</span>
            <span className="hidden sm:inline">Approvals</span>
            <span className="sm:hidden">Approve</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">📊</span>
            <span>Reports</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">💬</span>
            <span className="hidden sm:inline">Messages</span>
            <span className="sm:hidden">Chat</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">🔧</span>
            <span className="hidden sm:inline">Resources</span>
            <span className="sm:hidden">Tools</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">🎓</span>
            <span className="hidden sm:inline">Sections</span>
            <span className="sm:hidden">Batch</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">📋</span>
            <span className="hidden sm:inline">Validate</span>
            <span className="sm:hidden">Check</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          <div
            className="card hover:shadow-lg transition-shadow duration-300 cursor-pointer"
            onClick={() => (window.location.href = '/staff/approvals')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending Approvals
                </p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  12
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#fbbc05] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">📋</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="badge badge-warning">Needs attention</span>
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Resource Bookings
                </p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  8
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#1a73e8] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">🏫</span>
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Active bookings</span>
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Faculty Load</p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  85%
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#FF0000] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">👥</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="badge badge-warning">Average load</span>
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Messages</p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  4
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#34a853] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">💬</span>
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-[#34a853] font-medium">2 unread</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">notifications</span>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="card-title">Resource Status</h3>
                  <p className="card-description">Real-time availability</p>
                </div>
                <button className="btn-secondary text-xs px-2 py-1 w-full sm:w-auto">
                  📅 Book Now
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Available
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#34a853]">18</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Booked
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#fbbc05]">8</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Maintenance
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#FF0000]">2</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Batch Management</h3>
              <p className="card-description">Student grouping for practicals</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    CS Semester 5
                  </span>
                  <span className="badge badge-success text-xs">3 sections</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  120 students • 40 per section
                </p>
                <div className="flex gap-1 mt-2">
                  <button className="btn-ghost text-xs px-2 py-0.5">View</button>
                  <button className="btn-ghost text-xs px-2 py-0.5">Edit</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Communication Hub</h3>
              <p className="card-description">Inter-departmental coordination</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-danger text-xs">URGENT</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Room Conflict
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Lab 3 double-booked for CS practical
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    2h ago
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button className="btn-primary btn-primary-light dark:btn-primary-dark text-xs px-2 py-0.5">
                    Resolve
                  </button>
                  <button className="btn-ghost text-xs px-2 py-0.5">Reply</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
