"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'admin' | 'staff' | 'faculty' | 'student'
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: `/${role}/dashboard`, icon: '📊' },
    ]

    switch (role) {
      case 'admin':
        return [
          ...baseItems,
          { name: 'Users', href: '/admin/users', icon: '👥' },
          { name: 'Courses', href: '/admin/courses', icon: '📚' },
          { name: 'Classrooms', href: '/admin/classrooms', icon: '🏫' },
          { name: 'Timetables', href: '/admin/timetables', icon: '📅' },
          { name: 'Approvals', href: '/admin/approvals', icon: '✅' },
          { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
          { name: 'Logs', href: '/admin/logs', icon: '📋' },
        ]
      case 'staff':
        return [
          ...baseItems,
          { name: 'Approvals', href: '/staff/approvals', icon: '✅' },
          { name: 'Reports', href: '/staff/reports', icon: '📊' },
          { name: 'Analytics', href: '/staff/analytics', icon: '📈' },
          { name: 'Messages', href: '/staff/messages', icon: '💬' },
          { name: 'Resources', href: '/staff/resources', icon: '🔧' },
          { name: 'Sections', href: '/staff/sections', icon: '👨🎓' },
          { name: 'Workload', href: '/staff/workload', icon: '⚖️' },
        ]
      case 'faculty':
        return [
          ...baseItems,
          { name: 'Schedule', href: '/faculty/schedule', icon: '📅' },
          { name: 'Preferences', href: '/faculty/preferences', icon: '⚙️' },
          { name: 'Leave Requests', href: '/faculty/leave-requests', icon: '🏖️' },
          { name: 'Communication', href: '/faculty/communication', icon: '💬' },
        ]
      case 'student':
        return [
          ...baseItems,
          { name: 'Timetable', href: '/student/timetable', icon: '📅' },
          { name: 'Enrollments', href: '/student/enrollments', icon: '📝' },
          { name: 'Notifications', href: '/student/notifications', icon: '🔔' },
          { name: 'Feedback', href: '/student/feedback', icon: '💭' },
        ]
      default:
        return baseItems
    }
  }

  const items = getNavigationItems()

  return (
    <div className="min-h-screen bg-white dark:bg-[#2a2a2a] transition-colors duration-300">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#2a2a2a] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'} w-56`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 py-3 min-h-[60px]">
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="min-w-[2.5rem] w-10 h-10 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors duration-300 mx-auto flex items-center justify-center text-gray-600 dark:text-gray-300"
                title="Open menu"
              >
                <span className="text-lg">☰</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1a73e8] dark:bg-[#FF0000] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    S
                  </div>
                  <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">SIH28</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="hidden lg:block w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
                  >
                    <span className="text-lg leading-none">←</span>
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
                  >
                    <span className="text-lg leading-none">←</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {items.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`nav-link ${sidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:p-0' : 'px-3 py-2'}`}
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
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                👤
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {role === 'admin' ? 'Harsh Sharma' : 
                   role === 'staff' ? 'Priya Patel' :
                   role === 'faculty' ? 'Dr. Rajesh Kumar' : 'Arjun Singh'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
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
        <header className="bg-white dark:bg-[#2a2a2a] px-4 py-3 lg:px-6 relative z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSidebarOpen(true)
                  setSidebarCollapsed(false)
                }}
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 lg:hidden flex items-center justify-center text-gray-600 dark:text-gray-300"
                title="Open menu"
              >
                <span className="text-lg">☰</span>
              </button>

              <h1 className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-200 capitalize">
                {role}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300">
                🔔
              </button>
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
                >
                  ⚙️
                </button>
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[9999]">
                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center gap-2 rounded-lg">
                        👤 My Profile
                      </button>
                      <button 
                        onClick={() => { setShowSignOutDialog(true); setShowSettings(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-300 flex items-center gap-2 rounded-lg"
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
        <main className="h-[calc(100vh-73px)] overflow-y-auto p-3 lg:p-4 bg-gray-100 dark:bg-[#1f1f1f] scrollbar-hide">
          {children}
        </main>
      </div>
      
      {/* Sign Out Confirmation Dialog */}
      {showSignOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Sign Out
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowSignOutDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="btn-danger"
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