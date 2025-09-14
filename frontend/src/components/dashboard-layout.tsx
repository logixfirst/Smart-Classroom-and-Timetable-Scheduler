"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

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
          { name: 'Sections', href: '/staff/sections', icon: '🎓' },
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
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content Header */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-[#2a2a2a] px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                if (window.innerWidth >= 768) {
                  setSidebarCollapsed(!sidebarCollapsed)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300 ${sidebarCollapsed ? 'md:ml-[-10px]' : ''}`}
              title="Toggle menu"
            >
              <span className="text-sm sm:text-lg">☰</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1a73e8] dark:bg-[#1a73e8] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                <span className="text-sm sm:text-base">S</span>
              </div>
              <span className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">SIH28</span>
            </div>


          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300">
              <span className="text-sm sm:text-base">🔔</span>
            </button>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
            >
              <span className="text-sm sm:text-base">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
            <div className="relative" ref={settingsRef}>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center justify-center text-gray-600 dark:text-gray-300"
              >
                <span className="text-sm sm:text-base">⚙️</span>
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[9999]">
                  <div className="py-1">
                    <button className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-800 dark:text-gray-200 hover:bg-[#f5f5f5] dark:hover:bg-[#3c4043] transition-colors duration-300 flex items-center gap-2 rounded-lg">
                      <span className="text-sm">👤</span> My Profile
                    </button>
                    <button 
                      onClick={() => { setShowSignOutDialog(true); setShowSettings(false); }}
                      className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-[#f5f5f5] dark:hover:bg-red-900/20 transition-colors duration-300 flex items-center gap-2 rounded-lg"
                    >
                      <span className="text-sm">🚪</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`fixed top-[48px] sm:top-[54px] md:top-[60px] bottom-0 left-0 z-[60] bg-white dark:bg-[#2a2a2a] transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarCollapsed ? 'md:w-16' : 'md:w-56'} w-56`}>
        <div className="flex flex-col h-full">

          {/* Navigation */}
          <nav className="flex-1 p-2 sm:p-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${isActive ? 'nav-link-active' : 'nav-link'} ${sidebarCollapsed ? 'md:justify-center md:w-10' : 'px-2 sm:px-3'} py-1.5 sm:py-2 text-xs sm:text-sm`}
                  title={sidebarCollapsed ? item.name : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={`text-sm sm:text-lg ${sidebarCollapsed ? '' : 'mr-2 sm:mr-3'}`}>{item.icon}</span>
                  <span className={`${sidebarCollapsed ? 'md:hidden md:opacity-0' : 'md:opacity-100'} truncate transition-all duration-300 ease-in-out ${sidebarCollapsed ? '' : 'md:translate-x-0'} ${sidebarCollapsed ? 'md:-translate-x-2' : ''}`}>{item.name}</span>
                </a>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-2 sm:p-3">
            <div className={`flex items-center gap-2 sm:gap-3 ${sidebarCollapsed ? 'md:justify-center' : ''}`}>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm">👤</span>
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
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
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'}`}>
        <main className="min-h-[calc(100vh-20px)] sm:min-h-[calc(100vh-28px)] mt-16  mb-2 mr-2 ml-2 sm:mb-2 sm:mt-15 sm:mr-1 sm:ml-1 pt-[15px] sm:pt-[15px] md:pt-[15px] overflow-y-auto bg-gray-100 dark:bg-[#1f1f1f] scrollbar-hide rounded-2xl">
          <div className="pl-2 pr-2 pb-5 pt-5 sm:p-2 lg:p-4">
            {children}
          </div>
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