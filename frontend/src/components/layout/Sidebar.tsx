'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

interface SidebarProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  role: 'admin' | 'faculty' | 'student'
  setShowSignOutDialog: (show: boolean) => void
}

const getNavigationItems = (role: string) => {
  const baseItems = [{ name: 'Dashboard', href: `/${role}/dashboard`, icon: '📊' }]

  switch (role) {
    case 'admin':
      return [
        ...baseItems,
        { name: 'Admins', href: '/admin/admins', icon: '👨‍💼' },
        { name: 'Faculty', href: '/admin/faculty', icon: '👨‍🏫' },
        { name: 'Students', href: '/admin/students', icon: '🎓' },
        { name: 'academic', href: '/admin/academic/rooms', icon: '🗂️' },
        { name: 'Timetables', href: '/admin/timetables', icon: '📅' },
        { name: 'Approvals', href: '/admin/approvals', icon: '✅' },
        { name: 'Logs', href: '/admin/logs', icon: '📋' },
      ]
    case 'faculty':
      return [
        ...baseItems,
        { name: 'Schedule', href: '/faculty/schedule', icon: '📅' },
        { name: 'Preferences', href: '/faculty/preferences', icon: '⚙️' },
        { name: 'Leave Requests', href: '/faculty/leave-requests', icon: '🏦️' },
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

export default function Sidebar({
  sidebarOpen,
  sidebarCollapsed,
  setSidebarOpen,
  setSidebarCollapsed,
  role,
  setShowSignOutDialog,
}: SidebarProps) {
  const pathname = usePathname()
  const items = getNavigationItems(role)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
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
          {/* Toggle */}
          <div className="p-3 hidden md:block">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Toggle menu"
            >
              <span className="text-lg">☰</span>
            </button>
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
