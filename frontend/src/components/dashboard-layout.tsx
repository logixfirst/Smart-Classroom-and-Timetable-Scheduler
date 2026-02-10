'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'admin' | 'faculty' | 'student'
  pageTitle?: string
  pageDescription?: string
}

export default function DashboardLayout({
  children,
  role,
  pageTitle,
  pageDescription,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length > 1) {
      const page = segments[segments.length - 1]
      return page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' ')
    }
    return 'Dashboard'
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <div
        className={`min-h-screen bg-[#FFFFFF] dark:bg-[#121212] transition-colors duration-300 ${
          showSignOutDialog ? 'blur-sm' : ''
        }`}
      >
        <Sidebar
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
          setSidebarCollapsed={setSidebarCollapsed}
          role={role}
          setShowSignOutDialog={setShowSignOutDialog}
        />

        {/* Main content */}
        <div
          className={`transition-all duration-300 ease-out ${
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'
          }`}
        >
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white dark:bg-[#1E1E1E]">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                >
                  <span className="text-lg">☰</span>
                </button>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {getPageTitle()}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center relative"
                  >
                    <span className="text-lg">🔔</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                          <p className="text-sm text-gray-700 dark:text-gray-300">New timetable generated</p>
                          <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                        </div>
                      </div>
                      <Link
                        href={`/${role}/notifications`}
                        className="block p-3 text-center text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                        onClick={() => setShowNotifications(false)}
                      >
                        View all
                      </Link>
                    </div>
                  )}
                </div>

                {/* Settings */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                  >
                    <span className="text-lg">⚙️</span>
                  </button>
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span>👤</span> My Profile
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span>⚙️</span> Preferences
                      </button>
                      <button
                        onClick={() => {
                          setShowSignOutDialog(true)
                          setShowSettings(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-screen p-4 lg:p-6">{children}</main>
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-6 w-full max-w-sm border border-[#E0E0E0] dark:border-[#2A2A2A] shadow-2xl">
            <h3 className="text-lg font-semibold text-[#2C2C2C] dark:text-[#FFFFFF] mb-2">
              Sign Out
            </h3>
            <p className="text-sm text-[#6B6B6B] dark:text-[#B3B3B3] mb-6">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSignOutDialog(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => router.push('/login')} className="btn-danger">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
