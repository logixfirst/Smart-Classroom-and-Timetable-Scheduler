'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

interface SidebarProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  role: 'admin' | 'staff' | 'faculty' | 'student'
  setShowSignOutDialog: (show: boolean) => void
}

const getNavigationItems = (role: string) => {
  const baseItems = [{ name: 'Dashboard', href: `/${role}/dashboard`, icon: '📊' }]

  switch (role) {
    case 'admin':
      return [
        ...baseItems,
        { name: 'Admin Users', href: '/admin/users', icon: '👨‍💼' },
        { name: 'Faculty', href: '/admin/faculty', icon: '👨‍🏫' },
        { name: 'Students', href: '/admin/students', icon: '🎓' },
        { name: 'Attendance', href: '/admin/attendance', icon: '📝' },
        { name: 'Master Data', href: '/admin/data/classrooms', icon: '🗂️' },
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
        { name: 'Attendance', href: '/faculty/attendance', icon: '📝' },
        { name: 'Schedule', href: '/faculty/schedule', icon: '📅' },
        { name: 'Preferences', href: '/faculty/preferences', icon: '⚙️' },
        { name: 'Leave Requests', href: '/faculty/leave-requests', icon: '🏦️' },
        { name: 'Communication', href: '/faculty/communication', icon: '💬' },
      ]
    case 'student':
      return [
        ...baseItems,
        { name: 'Attendance', href: '/student/attendance', icon: '✅' },
        { name: 'Timetable', href: '/student/timetable', icon: '📅' },
        { name: 'Enrollments', href: '/student/enrollments', icon: '📝' },
        { name: 'Notifications', href: '/student/notifications', icon: '🔔' },
        { name: 'Feedback', href: '/student/feedback', icon: '💭' },
      ]
    default:
      return baseItems
  }
}

export default function Sidebar({
  sidebarOpen,
  sidebarCollapsed,
  setSidebarOpen,
  role,
  setShowSignOutDialog,
}: SidebarProps) {
  const pathname = usePathname()
  const items = getNavigationItems(role)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get user info from localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.username || user.name || '')
        setUserEmail(user.email || '')
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

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

  return (
    <>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-[60] bg-white dark:bg-[#2a2a2a] transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-16' : 'md:w-56'} w-56`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Toggle */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (window.innerWidth >= 768) {
                    setSidebarCollapsed(!sidebarCollapsed)
                  } else {
                    setSidebarOpen(!sidebarOpen)
                  }
                }}
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="Toggle menu"
              >
                <span className="text-lg">☰</span>
              </button>
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2196F3] to-[#1976D2] flex items-center justify-center text-white font-bold text-xs">
                    <span>S</span>
                  </div>
                  <span className="text-sm font-semibold text-[#0f0f0f] dark:text-white">
                    SIH28
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${isActive ? 'nav-link-active' : 'nav-link'} ${
                    sidebarCollapsed ? 'md:justify-start md:w-10' : ''
                  } pl-2 h-10 text-xs sm:text-sm`}
                  title={sidebarCollapsed ? item.name : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <span
                    className={`${
                      sidebarCollapsed ? 'md:hidden md:opacity-0' : 'md:opacity-100'
                    } truncate transition-all duration-300`}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            })}

            {/* Divider */}
            <div className="py-2">
              <div className="border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* Notifications */}
            <Link
              href={`/${role}/notifications`}
              className={`nav-link ${
                sidebarCollapsed ? 'md:justify-start md:w-10' : ''
              } pl-2 h-10 text-xs sm:text-sm relative`}
              title={sidebarCollapsed ? 'Notifications' : ''}
              onClick={() => setSidebarOpen(false)}
            >
              <div className="w-10 h-10 flex items-center justify-center relative">
                <span className="text-lg">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
              <span
                className={`${
                  sidebarCollapsed ? 'md:hidden md:opacity-0' : 'md:opacity-100'
                } truncate transition-all duration-300`}
              >
                Notifications
              </span>
            </Link>

            {/* Settings Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`nav-link w-full ${
                  sidebarCollapsed ? 'md:justify-start md:w-10' : ''
                } pl-2 h-10 text-xs sm:text-sm`}
                title={sidebarCollapsed ? 'Settings' : ''}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <span className="text-lg">⚙️</span>
                </div>
                <span
                  className={`${
                    sidebarCollapsed ? 'md:hidden md:opacity-0' : 'md:opacity-100'
                  } truncate transition-all duration-300`}
                >
                  Settings
                </span>
              </button>
              {showSettings && !sidebarCollapsed && (
                <div className="ml-12 mt-1 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-700">
                  <button className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                    <span>👤</span> My Profile
                  </button>
                  <button className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                    <span>⚙️</span> Preferences
                  </button>
                  <button
                    onClick={() => {
                      setShowSignOutDialog(true)
                      setShowSettings(false)
                      setSidebarOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* User info */}
          <div className="p-3">
            <div
              className={`flex items-center gap-2 ${sidebarCollapsed ? 'md:justify-center' : ''}`}
            >
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👤</span>
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  {userName ||
                    (role === 'admin'
                      ? 'Admin User'
                      : role === 'staff'
                        ? 'Staff User'
                        : role === 'faculty'
                          ? 'Faculty User'
                          : 'Student User')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {userEmail || `${role}@sih28.edu`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
