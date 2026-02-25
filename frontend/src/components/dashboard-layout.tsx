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
  const [copiedJobRef, setCopiedJobRef] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Human-readable labels for routes whose last real segment is a resource ID
  const UUID_PARENT_LABELS: Record<string, string> = {
    status: 'Generation Status',
  }

  const getPageInfo = (): { title: string; jobRef: string | null; fullId: string | null } => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return { title: 'Dashboard', jobRef: null, fullId: null }

    const last = segments[segments.length - 1]

    if (UUID_RE.test(last)) {
      const parent = segments[segments.length - 2] ?? ''
      const label =
        UUID_PARENT_LABELS[parent] ??
        (parent.charAt(0).toUpperCase() + parent.slice(1).replace(/-/g, ' '))
      return { title: label, jobRef: '#' + last.slice(0, 8).toUpperCase(), fullId: last }
    }

    return {
      title:
        segments.length > 1
          ? last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
          : 'Dashboard',
      jobRef: null,
      fullId: null,
    }
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
                {(() => {
                  const { title, jobRef, fullId } = getPageInfo()
                  return (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        {pageTitle ?? title}
                      </h1>
                      {jobRef && fullId && (
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(fullId)
                              setCopiedJobRef(true)
                              setTimeout(() => setCopiedJobRef(false), 2000)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold
                              bg-blue-50 text-blue-600 border border-blue-100 cursor-pointer
                              hover:bg-blue-100 hover:border-blue-300
                              dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800
                              dark:hover:bg-blue-900 dark:hover:border-blue-600
                              transition-colors tracking-wide select-none"
                          >
                            {copiedJobRef ? (
                              <>
                                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Copied
                              </>
                            ) : (
                              <>
                                {jobRef}
                                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 shrink-0 opacity-50"><rect x="1" y="3" width="7" height="8" rx="1"/><path d="M4 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-1"/></svg>
                              </>
                            )}
                          </button>
                          {/* Tooltip — full UUID on hover */}
                          <div className="absolute left-0 top-full mt-2 z-50 pointer-events-none
                            opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-200">
                            <div className="bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-mono
                              px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                              <p className="text-gray-400 text-[10px] mb-0.5 font-sans not-italic">Job ID</p>
                              {fullId}
                            </div>
                            {/* Arrow */}
                            <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
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
