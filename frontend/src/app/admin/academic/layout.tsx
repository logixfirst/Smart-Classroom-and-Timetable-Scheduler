'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { id: 'schools', label: 'Schools', href: '/admin/academic/schools' },
  { id: 'departments', label: 'Departments', href: '/admin/academic/departments' },
  { id: 'programs', label: 'Programs', href: '/admin/academic/programs' },
  { id: 'courses', label: 'Courses', href: '/admin/academic/courses' },
  { id: 'buildings', label: 'Buildings', href: '/admin/academic/buildings' },
  { id: 'rooms', label: 'Rooms', href: '/admin/academic/rooms' },
]

export default function DataLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                pathname === tab.href
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  )
}
