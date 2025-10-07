'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { id: 'classrooms', label: 'Classrooms', href: '/admin/data/classrooms' },
  { id: 'labs', label: 'Labs', href: '/admin/data/labs' },
  { id: 'subjects', label: 'Subjects', href: '/admin/data/subjects' },
  { id: 'batches', label: 'Batches', href: '/admin/data/batches' },
]

export default function DataLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
            Master Data Management
          </h1>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
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
    </DashboardLayout>
  )
}