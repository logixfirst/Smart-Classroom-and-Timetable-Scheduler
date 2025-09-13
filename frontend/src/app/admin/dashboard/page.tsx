"use client"

import DashboardLayout from '@/components/dashboard-layout'
import QuickActions from './components/QuickActions'

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-indigo-500/10 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300">Total Users</p>
                <p className="text-2xl lg:text-4xl font-bold text-white truncate">1,234</p>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-indigo-600/30 backdrop-blur-sm border border-indigo-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
                <span className="text-xl lg:text-3xl">👥</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-400 font-semibold">↗ 12%</span>
              <span className="ml-2 text-slate-400">vs last month</span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-emerald-500/10 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300">Active Courses</p>
                <p className="text-2xl lg:text-4xl font-bold text-white truncate">56</p>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-emerald-600/30 backdrop-blur-sm border border-emerald-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                <span className="text-xl lg:text-3xl">📚</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-400 font-semibold">↗ 8%</span>
              <span className="ml-2 text-slate-400">vs last month</span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-amber-500/10 transition-all duration-300 ease-in-out cursor-pointer" onClick={() => window.location.href='/admin/approvals'}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300">Pending Approvals</p>
                <p className="text-2xl lg:text-4xl font-bold text-white truncate">12</p>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-amber-600/30 backdrop-blur-sm border border-amber-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
                <span className="text-xl lg:text-3xl">⏳</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/50 rounded-full backdrop-blur-sm">Needs attention</span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 hover:shadow-emerald-500/10 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300">System Health</p>
                <p className="text-2xl lg:text-4xl font-bold text-white truncate">98%</p>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-emerald-600/30 backdrop-blur-sm border border-emerald-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                <span className="text-xl lg:text-3xl">❤️</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-400 font-semibold">All services online</span>
            </div>
          </div>
        </div>

        {/* Analytics & Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
            <div className="pb-4 border-b border-slate-600/50 mb-4">
              <h3 className="text-lg lg:text-2xl font-bold text-white">Utilization Reports</h3>
              <p className="text-sm text-slate-300 mt-1">Resource usage analytics</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Classroom Usage</span>
                <span className="font-bold text-emerald-400">87%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full shadow-lg shadow-emerald-500/25" style={{width: '87%'}}></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Faculty Load</span>
                <span className="font-bold text-amber-400">73%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-3 rounded-full shadow-lg shadow-amber-500/25" style={{width: '73%'}}></div>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
            <div className="pb-4 border-b border-slate-600/50 mb-4">
              <h3 className="text-lg lg:text-2xl font-bold text-white">Conflict Detection</h3>
              <p className="text-sm text-slate-300 mt-1">AI-powered conflict analysis</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-lg shadow-red-500/50"></div>
                <span className="text-sm font-medium text-white">3 Schedule conflicts</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-500/50"></div>
                <span className="text-sm font-medium text-white">5 Room overlaps</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50"></div>
                <span className="text-sm font-medium text-white">12 Resolved today</span>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
            <div className="pb-4 border-b border-slate-600/50 mb-4">
              <h3 className="text-lg lg:text-2xl font-bold text-white">System Notifications</h3>
              <p className="text-sm text-slate-300 mt-1">Alerts and announcements</p>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 border-l-4 border-l-amber-400 rounded-lg shadow-lg">
                <p className="text-sm font-semibold text-white">AI Engine Update</p>
                <p className="text-xs text-slate-300 mt-1">Optimization algorithm improved by 15%</p>
              </div>
              <div className="p-4 bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/30 border-l-4 border-l-indigo-400 rounded-lg shadow-lg">
                <p className="text-sm font-semibold text-white">New Faculty Added</p>
                <p className="text-xs text-slate-300 mt-1">3 new faculty members registered</p>
              </div>
              <div className="p-4 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 border-l-4 border-l-emerald-400 rounded-lg shadow-lg">
                <p className="text-sm font-semibold text-white">Backup Complete</p>
                <p className="text-xs text-slate-300 mt-1">Daily system backup successful</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Control Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">System Health Monitor</h3>
              <p className="card-description">Real-time service status</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-400/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                  <span className="text-sm font-medium text-white">Django API</span>
                </div>
                <span className="text-sm text-emerald-400 font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-400/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                  <span className="text-sm font-medium text-white">FastAPI AI Service</span>
                </div>
                <span className="text-sm text-emerald-400 font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-400/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                  <span className="text-sm font-medium text-white">Database Connection</span>
                </div>
                <span className="text-sm text-emerald-400 font-medium">Healthy</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">Data Management</h3>
              <p className="card-description">Import/Export operations</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-lg hover:bg-blue-500/30 hover:shadow-blue-500/20 border border-blue-400/30 transition-all duration-300 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">📥</span>
                  <span className="text-sm font-medium text-white">Import CSV</span>
                </div>
                <p className="text-xs text-slate-300">Bulk upload data</p>
              </button>
              <button className="p-3 bg-emerald-500/20 backdrop-blur-sm rounded-lg hover:bg-emerald-500/30 hover:shadow-emerald-500/20 border border-emerald-400/30 transition-all duration-300 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">📤</span>
                  <span className="text-sm font-medium text-white">Export PDF</span>
                </div>
                <p className="text-xs text-slate-300">Generate reports</p>
              </button>
              <button className="p-3 bg-purple-500/20 backdrop-blur-sm rounded-lg hover:bg-purple-500/30 hover:shadow-purple-500/20 border border-purple-400/30 transition-all duration-300 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">💾</span>
                  <span className="text-sm font-medium text-white">Backup DB</span>
                </div>
                <p className="text-xs text-slate-300">Create snapshot</p>
              </button>
              <button className="p-3 bg-orange-500/20 backdrop-blur-sm rounded-lg hover:bg-orange-500/30 hover:shadow-orange-500/20 border border-orange-400/30 transition-all duration-300 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🔄</span>
                  <span className="text-sm font-medium text-white">Restore</span>
                </div>
                <p className="text-xs text-slate-300">From backup</p>
              </button>
            </div>
          </div>
        </div>

        {/* Audit & Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">Recent Audit Trail</h3>
              <p className="card-description">Critical system actions</p>
            </div>
            <div className="space-y-2">
              {[
                { action: 'Timetable Approved', user: 'priya.patel@sih28.edu', time: '2 min ago', type: 'success' },
                { action: 'User Role Changed', user: 'harsh.sharma@sih28.edu', time: '15 min ago', type: 'warning' },
                { action: 'Course Updated', user: 'rajesh.kumar@sih28.edu', time: '1h ago', type: 'info' },
                { action: 'Login Failed', user: 'unknown', time: '2h ago', type: 'error' }
              ].map((log, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-slate-500/10 backdrop-blur-sm rounded-lg text-sm border border-slate-600/30">
                  <div className={`w-2 h-2 rounded-full shadow-lg ${
                    log.type === 'success' ? 'bg-emerald-400 shadow-emerald-500/50' :
                    log.type === 'warning' ? 'bg-amber-400 shadow-amber-500/50' :
                    log.type === 'error' ? 'bg-red-400 shadow-red-500/50' : 'bg-blue-400 shadow-blue-500/50'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-white">{log.action}</p>
                    <p className="text-slate-300 truncate text-xs">{log.user}</p>
                  </div>
                  <span className="text-slate-400 text-xs flex-shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">Role Management</h3>
              <p className="card-description">Permission control</p>
            </div>
            <div className="space-y-2">
              {[
                { role: 'Admin', users: 3, permissions: 'All Access' },
                { role: 'Staff', users: 8, permissions: 'Approvals, Reports' },
                { role: 'Faculty', users: 45, permissions: 'Schedule View' },
                { role: 'HOD', users: 5, permissions: 'Dept. Management' }
              ].map((role, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-500/10 backdrop-blur-sm rounded-lg border border-slate-600/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{role.role}</p>
                    <p className="text-xs text-slate-300 truncate">{role.permissions}</p>
                  </div>
                  <span className="text-sm font-medium text-white">{role.users}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">System Configuration</h3>
              <p className="card-description">Global settings</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-slate-500/10 backdrop-blur-sm rounded-lg border border-slate-600/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">Academic Year</span>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Edit</button>
                </div>
                <p className="text-xs text-slate-300">2024-25</p>
              </div>
              <div className="p-3 bg-slate-500/10 backdrop-blur-sm rounded-lg border border-slate-600/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">Semester Dates</span>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Edit</button>
                </div>
                <p className="text-xs text-slate-300">Jul 1 - Dec 15</p>
              </div>
              <div className="p-3 bg-slate-500/10 backdrop-blur-sm rounded-lg border border-slate-600/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">Holiday List</span>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Edit</button>
                </div>
                <p className="text-xs text-slate-300">15 holidays configured</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </DashboardLayout>
  )
}