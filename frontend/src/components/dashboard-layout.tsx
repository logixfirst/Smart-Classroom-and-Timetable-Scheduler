"use client"

import { useState } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'admin' | 'staff' | 'faculty' | 'student'
}

const navigationItems = {
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Users', href: '/admin/users', icon: '👥' },
    { name: 'Courses', href: '/admin/courses', icon: '📚' },
    { name: 'Classrooms', href: '/admin/classrooms', icon: '🏫' },
    { name: 'Timetables', href: '/admin/timetables', icon: '📅' },
    { name: 'Approvals', href: '/admin/approvals', icon: '✅' },
  ],
  staff: [
    { name: 'Dashboard', href: '/staff/dashboard', icon: '📊' },
    { name: 'Approvals', href: '/staff/approvals', icon: '✅' },
    { name: 'Reports', href: '/staff/reports', icon: '📊' },
    { name: 'Analytics', href: '/staff/analytics', icon: '📊' },
  ],
  faculty: [
    { name: 'Dashboard', href: '/faculty/dashboard', icon: '📊' },
    { name: 'My Schedule', href: '/faculty/schedule', icon: '📅' },
    { name: 'Preferences', href: '/faculty/preferences', icon: '⚙️' },
    { name: 'Leave Requests', href: '/faculty/leave-requests', icon: '📝' },
  ],
  student: [
    { name: 'Dashboard', href: '/student/dashboard', icon: '📊' },
    { name: 'My Timetable', href: '/student/timetable', icon: '📅' },
    { name: 'Enrollments', href: '/student/enrollments', icon: '📚' },
    { name: 'Notifications', href: '/student/notifications', icon: '🔔' },
  ],
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const items = navigationItems[role] || []

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Settings dropdown overlay */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[60] bg-black/30 backdrop-blur-xl border-r border-slate-700/50 shadow-2xl transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'} w-56`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 py-3 min-h-[60px]">
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="min-w-[2.5rem] w-10 h-10 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 active:bg-neutral-200 dark:active:bg-neutral-600 active:scale-95 transition-all duration-100 mx-auto flex items-center justify-center"
                title="Open menu"
              >
                <span className="text-lg">☰</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600/80 backdrop-blur-sm border border-indigo-500/50 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
                    S
                  </div>
                  <span className="text-xl font-bold text-white">SIH28</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="hidden lg:block w-10 h-10 rounded-lg hover:bg-slate-500/20 active:bg-slate-500/40 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center"
                  >
                    <span className="text-lg leading-none">←</span>
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden w-10 h-10 rounded-lg hover:bg-slate-500/20 active:bg-slate-500/40 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center"
                  >
                    <span className="text-lg leading-none">←</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide" style={{overscrollBehavior: 'contain'}}>
            {items.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center text-sm font-medium text-slate-300 hover:bg-slate-500/20 hover:text-white rounded-lg backdrop-blur-sm transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:p-0' : 'px-3 py-2'}`}
                title={sidebarCollapsed ? item.name : ''}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={`text-lg ${sidebarCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
              </a>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="w-8 h-8 bg-slate-500/30 backdrop-blur-sm border border-slate-600 rounded-full flex items-center justify-center shadow-lg">
                👤
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-sm font-medium text-white truncate">
                  {role === 'admin' ? 'Harsh Sharma' : 
                   role === 'staff' ? 'Priya Patel' :
                   role === 'faculty' ? 'Dr. Rajesh Kumar' : 'Arjun Singh'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {role === 'admin' ? 'harsh.sharma@sih28.edu' : 
                   role === 'staff' ? 'priya.patel@sih28.edu' :
                   role === 'faculty' ? 'rajesh.kumar@sih28.edu' : 'arjun.singh@sih28.edu'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'}`}>
        {/* Header */}
        <header className="bg-black/30 backdrop-blur-xl border-b border-slate-700/50 shadow-lg px-4 py-3 lg:px-6 relative z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSidebarOpen(true)
                  setSidebarCollapsed(false)
                }}
                className={`w-10 h-10 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 active:bg-neutral-200 dark:active:bg-neutral-600 active:scale-95 transition-all duration-100 lg:hidden flex items-center justify-center`}
                title="Open menu"
              >
                <span className="text-lg">☰</span>
              </button>

              <h1 className="text-lg lg:text-xl font-semibold text-white capitalize">
                {role}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-lg hover:bg-slate-500/20 active:bg-slate-500/40 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center shadow-lg">
                🔔
              </button>
              <button className="w-10 h-10 rounded-lg hover:bg-slate-500/20 active:bg-slate-500/40 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center shadow-lg">
                🌙
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-10 h-10 rounded-lg hover:bg-slate-500/20 active:bg-slate-500/40 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center shadow-lg"
                >
                  ⚙️
                </button>
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl z-[9999]">
                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-500/20 active:bg-slate-500/40 transition-all duration-300 ease-in-out flex items-center gap-2 rounded-lg">
                        👤 My Profile
                      </button>
                      <button 
                        onClick={() => { setShowSignOutDialog(true); setShowSettings(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 active:bg-red-500/40 transition-all duration-300 ease-in-out flex items-center gap-2 rounded-lg"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-8 bg-black/20 backdrop-blur-lg rounded-2xl m-2 lg:m-4 h-[calc(100vh-76px)] overflow-y-auto scrollbar-hide shadow-2xl" style={{overscrollBehavior: 'contain'}}>
          {children}
        </main>
      </div>
      
      {/* Sign Out Confirmation Dialog */}
      {showSignOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-slate-600 shadow-2xl z-20">
            <h3 className="text-lg font-semibold text-white mb-2">
              Sign Out
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowSignOutDialog(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-500/20 hover:bg-slate-500/40 active:bg-slate-500/60 active:scale-98 rounded-lg transition-all duration-300 ease-in-out"
              >
                Cancel
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600/80 hover:bg-red-600 active:bg-red-700 active:scale-98 rounded-lg shadow-lg hover:shadow-red-500/25 transition-all duration-300 ease-in-out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}