"use client"

import DashboardLayout from '@/components/dashboard-layout'

export default function StaffDashboard() {
  return (
    <DashboardLayout role="staff">
      <div className="space-y-4 sm:space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
          <button className="btn-primary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">📅</span>
            <span className="hidden sm:inline">Book Room</span>
            <span className="sm:hidden">Book</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">👥</span>
            <span className="hidden sm:inline">Workload</span>
            <span className="sm:hidden">Load</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">✅</span>
            <span className="hidden sm:inline">Approvals</span>
            <span className="sm:hidden">Approve</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">📊</span>
            <span>Reports</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">💬</span>
            <span className="hidden sm:inline">Messages</span>
            <span className="sm:hidden">Chat</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">🔧</span>
            <span className="hidden sm:inline">Resources</span>
            <span className="sm:hidden">Tools</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">👨‍🎓</span>
            <span className="hidden sm:inline">Sections</span>
            <span className="sm:hidden">Batch</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-14 sm:h-16 text-xs">
            <span className="text-base sm:text-lg mb-1">📋</span>
            <span className="hidden sm:inline">Validate</span>
            <span className="sm:hidden">Check</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-8">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-amber-500/10 transition-all duration-300 ease-in-out cursor-pointer" onClick={() => window.location.href='/staff/approvals'}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-300">Pending Approvals</p>
                <p className="text-lg sm:text-xl lg:text-4xl font-bold text-white truncate">12</p>
              </div>
              <div className="w-10 h-10 lg:w-16 lg:h-16 bg-amber-600/30 backdrop-blur-sm border border-amber-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
                <span className="text-lg lg:text-3xl">📋</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/50 rounded-full backdrop-blur-sm">Needs attention</span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-indigo-500/10 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-300">Resource Bookings</p>
                <p className="text-lg sm:text-xl lg:text-4xl font-bold text-white truncate">8</p>
              </div>
              <div className="w-10 h-10 lg:w-16 lg:h-16 bg-indigo-600/30 backdrop-blur-sm border border-indigo-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
                <span className="text-lg lg:text-3xl">🏫</span>
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs sm:text-sm">
              <span className="text-slate-400">Active bookings</span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-orange-500/10 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-300">Faculty Load</p>
                <p className="text-lg sm:text-xl lg:text-4xl font-bold text-white truncate">85%</p>
              </div>
              <div className="w-10 h-10 lg:w-16 lg:h-16 bg-orange-600/30 backdrop-blur-sm border border-orange-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/25">
                <span className="text-lg lg:text-3xl">👥</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/50 rounded-full backdrop-blur-sm">Average load</span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-emerald-500/10 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-300">Messages</p>
                <p className="text-lg sm:text-xl lg:text-4xl font-bold text-white truncate">4</p>
              </div>
              <div className="w-10 h-10 lg:w-16 lg:h-16 bg-emerald-600/30 backdrop-blur-sm border border-emerald-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                <span className="text-lg lg:text-3xl">💬</span>
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs sm:text-sm">
              <span className="text-emerald-400 font-semibold">2 unread</span>
              <span className="ml-2 text-slate-400">notifications</span>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="card-title text-sm sm:text-base">Resource Status</h3>
                  <p className="card-description text-xs sm:text-sm">Real-time availability</p>
                </div>
                <button className="btn-secondary text-xs px-2 py-1 h-7 w-full sm:w-auto">
                  📅 Book Now
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">Available</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-green-600">18</span>
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm font-medium">Booked</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-yellow-600">8</span>
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm font-medium">Maintenance</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-red-600">2</span>
              </div>
              <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mb-1">Quick Booking</h4>
                <div className="flex gap-1">
                  <select className="flex-1 text-xs p-1 border rounded bg-white dark:bg-neutral-700">
                    <option>Select Room</option>
                    <option>Lab 1</option>
                    <option>Lab 2</option>
                    <option>Auditorium</option>
                  </select>
                  <button className="btn-primary text-xs px-2 py-1">Book</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="card-title text-sm sm:text-base">Batch & Section Management</h3>
                  <p className="card-description text-xs sm:text-sm">Student grouping for practicals</p>
                </div>
                <button className="btn-secondary text-xs px-2 py-1 h-7 w-full sm:w-auto">
                  ➕ Split Batch
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium">CS Semester 5</span>
                  <span className="badge badge-success text-xs">3 sections</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">120 students • 40 per section</p>
                <div className="flex gap-1 mt-2">
                  <button className="btn-ghost text-xs px-2 py-0.5">View</button>
                  <button className="btn-ghost text-xs px-2 py-0.5">Edit</button>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium">EE Semester 3</span>
                  <span className="badge badge-warning text-xs">Pending Split</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">80 students • Split needed for labs</p>
                <button className="btn-primary text-xs px-2 py-0.5 mt-2 w-full">Auto-Split</button>
              </div>
              <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium">ME Semester 4</span>
                  <span className="badge badge-info text-xs">2 sections</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">65 students • Workshop groups</p>
                <div className="flex gap-1 mt-2">
                  <button className="btn-ghost text-xs px-2 py-0.5">Reschedule</button>
                  <button className="btn-ghost text-xs px-2 py-0.5">Merge</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="card-title text-sm sm:text-base">Communication Hub</h3>
                  <p className="card-description text-xs sm:text-sm">Inter-departmental coordination</p>
                </div>
                <button className="btn-secondary text-xs px-2 py-1 h-7 w-full sm:w-auto">
                  💬 New Message
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-danger text-xs">URGENT</span>
                      <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">Room Conflict</p>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">Lab 3 double-booked for CS practical</p>
                  </div>
                  <span className="text-xs text-red-600 flex-shrink-0">2h ago</span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button className="btn-primary text-xs px-2 py-0.5">Resolve</button>
                  <button className="btn-ghost text-xs px-2 py-0.5">Reply</button>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200">Faculty Request</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Dr. Rajesh Kumar requests schedule change for next week</p>
                  </div>
                  <span className="text-xs text-green-600 flex-shrink-0">4h ago</span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button className="btn-success text-xs px-2 py-0.5">Approve</button>
                  <button className="btn-ghost text-xs px-2 py-0.5">Discuss</button>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200">Maintenance Alert</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">Auditorium AC repair scheduled tomorrow</p>
                  </div>
                  <span className="text-xs text-yellow-600 flex-shrink-0">1d ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Workload Management */}
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="card-title text-sm sm:text-base">Faculty Workload Management</h3>
                <p className="card-description text-xs sm:text-sm">Monitor teaching load distribution</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs px-2 py-1 h-7">
                  📄 Export
                </button>
                <button className="btn-primary text-xs px-2 py-1 h-7">
                  ⚙️ Rebalance
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {[
              { name: 'Dr. Rajesh Kumar', dept: 'CS', load: 95, hours: 19, status: 'overloaded', courses: 4 },
              { name: 'Prof. Meera Sharma', dept: 'EE', load: 85, hours: 17, status: 'optimal', courses: 3 },
              { name: 'Dr. Vikram Gupta', dept: 'ME', load: 60, hours: 12, status: 'underloaded', courses: 2 },
              { name: 'Prof. Suresh Reddy', dept: 'CS', load: 80, hours: 16, status: 'optimal', courses: 3 },
              { name: 'Dr. Anita Verma', dept: 'EE', load: 100, hours: 20, status: 'overloaded', courses: 5 },
              { name: 'Prof. Kavita Joshi', dept: 'ME', load: 75, hours: 15, status: 'optimal', courses: 3 }
            ].map((faculty, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                faculty.status === 'overloaded' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                faculty.status === 'underloaded' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                'bg-green-50 dark:bg-green-900/20 border-green-500'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100">{faculty.name}</h4>
                  <span className={`badge text-xs ${
                    faculty.status === 'overloaded' ? 'badge-danger' :
                    faculty.status === 'underloaded' ? 'badge-warning' : 'badge-success'
                  }`}>
                    {faculty.load}%
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Hours/Week</span>
                    <span className="font-medium">{faculty.hours}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Courses</span>
                    <span className="font-medium">{faculty.courses}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Department</span>
                    <span className="font-medium">{faculty.dept}</span>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mt-2">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      faculty.status === 'overloaded' ? 'bg-red-600' :
                      faculty.status === 'underloaded' ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(faculty.load, 100)}%` }}
                  ></div>
                </div>
                <div className="flex gap-1 mt-2">
                  <button className="btn-ghost text-xs px-2 py-0.5 flex-1">View</button>
                  <button className="btn-ghost text-xs px-2 py-0.5 flex-1">Adjust</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow & Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="card-title text-sm sm:text-base">Approval Workflow</h3>
                  <p className="card-description text-xs sm:text-sm">Timetable validation pipeline</p>
                </div>
                <button className="btn-primary text-xs sm:text-sm px-3 py-1.5 w-full sm:w-auto">
                  View All
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { dept: 'Computer Science - Sem 5', status: 'Validation', progress: 75, type: 'warning', conflicts: 3 },
                { dept: 'Electronics - Sem 3', status: 'Admin Review', progress: 90, type: 'success', conflicts: 0 },
                { dept: 'Mathematics - Sem 2', status: 'Conflicts Found', progress: 45, type: 'error', conflicts: 7 },
                { dept: 'Mechanical - Sem 4', status: 'Ready', progress: 100, type: 'success', conflicts: 0 }
              ].map((item, index) => (
                <div key={index} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.dept}</span>
                    <div className="flex items-center gap-2">
                      {item.conflicts > 0 && (
                        <span className="badge badge-danger text-xs">{item.conflicts} conflicts</span>
                      )}
                      <span className={`badge text-xs ${
                        item.type === 'success' ? 'badge-success' :
                        item.type === 'warning' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        item.type === 'success' ? 'bg-green-600' :
                        item.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.progress}% complete</p>
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs px-2 py-0.5">Review</button>
                      {item.type === 'error' && (
                        <button className="btn-primary text-xs px-2 py-0.5">Fix</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="card-title text-sm sm:text-base">Quick Reports</h3>
                  <p className="card-description text-xs sm:text-sm">Generate operational reports</p>
                </div>
                <button className="btn-secondary text-xs sm:text-sm px-3 py-1.5 w-full sm:w-auto">
                  All Reports
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <button className="btn-secondary p-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">👥</span>
                  <span className="text-xs sm:text-sm font-medium">Faculty Load</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Workload distribution</p>
              </button>
              <button className="btn-secondary p-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🏫</span>
                  <span className="text-xs sm:text-sm font-medium">Room Usage</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Utilization stats</p>
              </button>
              <button className="btn-secondary p-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">⏰</span>
                  <span className="text-xs sm:text-sm font-medium">Free Slots</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Available periods</p>
              </button>
              <button className="btn-secondary p-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">⚠️</span>
                  <span className="text-xs sm:text-sm font-medium">Conflicts</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Issue summary</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}