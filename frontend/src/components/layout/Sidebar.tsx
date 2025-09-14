interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  role: 'admin' | 'staff' | 'faculty' | 'student'
}

const navigationItems = {
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Users', href: '/admin/users', icon: '👥' },
    { name: 'Courses', href: '/admin/courses', icon: '📚' },
    { name: 'Classrooms', href: '/admin/classrooms', icon: '🏫' },
    { name: 'Timetables', href: '/admin/timetables', icon: '📅' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
    { name: 'Logs', href: '/admin/logs', icon: '📋' },
  ],
  staff: [
    { name: 'Dashboard', href: '/staff/dashboard', icon: '📊' },
    { name: 'Approvals', href: '/staff/approvals', icon: '✅' },
    { name: 'Reports', href: '/staff/reports', icon: '📊' },
  ],
  faculty: [
    { name: 'Dashboard', href: '/faculty/dashboard', icon: '📊' },
    { name: 'My Schedule', href: '/faculty/schedule', icon: '📅' },
    { name: 'Preferences', href: '/faculty/preferences', icon: '⚙️' },
  ],
  student: [
    { name: 'Dashboard', href: '/student/dashboard', icon: '📊' },
    { name: 'My Timetable', href: '/student/timetable', icon: '📅' },
    { name: 'Feedback', href: '/student/feedback', icon: '💬' },
  ],
}

export default function Sidebar({ isOpen, onClose, role }: SidebarProps) {
  const items = navigationItems[role] || []

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-neutral-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
          {items.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="nav-link text-sm sm:text-base py-2 sm:py-3"
              onClick={onClose}
            >
              <span className="mr-2 sm:mr-3 text-base sm:text-lg">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </a>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-300 dark:bg-neutral-600 rounded-full flex items-center justify-center flex-shrink-0">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {role.charAt(0).toUpperCase() + role.slice(1)} User
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                user@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}