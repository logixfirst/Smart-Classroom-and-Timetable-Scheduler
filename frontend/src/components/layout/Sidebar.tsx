'use client'

import { usePathname } from 'next/navigation'

interface SidebarProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  role: 'admin' | 'staff' | 'faculty' | 'student'
}

const getNavigationItems = (role: string) => {
  const baseItems = [{ name: 'Dashboard', href: `/${role}/dashboard`, icon: '📊' }]

  switch (role) {
    case 'admin':
      return [
        ...baseItems,
        { name: 'Users', href: '/admin/users', icon: '👥' },
        { name: 'Faculty', href: '/admin/faculty', icon: '👨' },
        { name: 'Students', href: '/admin/students', icon: '🎓' },
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
  role,
}: SidebarProps) {
  const pathname = usePathname()
  const items = getNavigationItems(role)

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
        className={`fixed top-[48px] sm:top-[54px] md:top-[60px] bottom-0 left-0 z-[60] bg-white dark:bg-[#2a2a2a] transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarCollapsed ? 'md:w-16' : 'md:w-56'} w-56`}
      >
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${isActive ? 'nav-link-active' : 'nav-link'} ${sidebarCollapsed ? 'md:justify-start md:w-10' : ''} pl-2 sm:pl-2 h-10 text-xs sm:text-sm`}
                  title={sidebarCollapsed ? item.name : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="w-10 h-10 flex items-center justify-center ">
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <span
                    className={`${sidebarCollapsed ? 'md:hidden md:opacity-0' : 'md:opacity-100'}  truncate transition-all duration-300 ease-in-out ${sidebarCollapsed ? '' : 'md:translate-x-0'} ${sidebarCollapsed ? 'md:-translate-x-2' : ''}`}
                  >
                    {item.name}
                  </span>
                </a>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-2 sm:p-3">
            <div
              className={`flex items-center gap-2 sm:gap-3 ${sidebarCollapsed ? 'md:justify-center md:w-10' : ''}`}
            >
              <div className="w-10 h-10 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm">👤</span>
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {role === 'admin'
                    ? 'Harsh Sharma'
                    : role === 'staff'
                      ? 'Priya Patel'
                      : role === 'faculty'
                        ? 'Dr. Rajesh Kumar'
                        : 'Arjun Singh'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {role === 'admin'
                    ? 'harsh.sharma@sih28.edu'
                    : role === 'staff'
                      ? 'priya.patel@sih28.edu'
                      : role === 'faculty'
                        ? 'rajesh.kumar@sih28.edu'
                        : 'arjun.singh@sih28.edu'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
