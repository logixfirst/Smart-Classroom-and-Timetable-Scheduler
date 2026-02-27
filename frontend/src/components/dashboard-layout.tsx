'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
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

  // Restore persisted sidebar state after hydration
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) setSidebarCollapsed(stored === 'true')
  }, [])

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])
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
        className={`min-h-screen transition-colors duration-300 ${
          showSignOutDialog ? 'blur-sm' : ''
        }`}
        style={{ backgroundColor: 'var(--color-bg-page)' }}
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
          className={`transition-all duration-150 ease-out ${
            sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-[240px]'
          }`}
        >
          {/* Header */}
          <header
            className="app-header sticky top-0 z-30"
            style={{
              backgroundColor: 'var(--color-header-bg)',
              borderBottom: '1px solid var(--color-header-border)',
              height: 'var(--header-height)',
            }}
          >
            <div className="flex items-center justify-between px-4 lg:px-6 h-full gap-3">
              {/* Left: Hamburger + Logo + Title */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    if (window.matchMedia('(min-width: 768px)').matches) {
                      setSidebarCollapsed(c => !c)
                    } else {
                      setSidebarOpen(true)
                    }
                  }}
                  className="icon-button"
                  aria-label="Toggle navigation"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <line x1="3" y1="5" x2="17" y2="5"/>
                    <line x1="3" y1="10" x2="17" y2="10"/>
                    <line x1="3" y1="15" x2="17" y2="15"/>
                  </svg>
                </button>

                {/* Logo — mobile only; sidebar owns branding on desktop */}
                <Image
                  className="md:hidden"
                  src="/logo2.png"
                  alt="Cadence logo"
                  width={32}
                  height={32}
                  style={{ flexShrink: 0, objectFit: 'contain', borderRadius: '50%', mixBlendMode: 'multiply' }}
                />

                <span
                  className="hidden sm:inline md:hidden"
                  style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  Cadence
                </span>

                {/* UUID Job ID badge */}
                {(() => {
                  const { jobRef, fullId } = getPageInfo()
                  if (!jobRef || !fullId) return null
                  return (
                    <div className="hidden md:block relative group">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fullId)
                          setCopiedJobRef(true)
                          setTimeout(() => setCopiedJobRef(false), 2000)
                        }}
                        className="inline-flex items-center gap-1 font-mono cursor-pointer select-none"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-bg-surface-2)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border)',
                          letterSpacing: '0.03em',
                        }}
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
                      {/* Tooltip */}
                      <div className="absolute left-0 top-full mt-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-200">
                        <div
                          className="text-[11px] font-mono px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                          style={{ background: 'var(--color-bg-surface-3)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-dropdown)' }}
                        >
                          <p className="text-[10px] font-sans" style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>Job ID</p>
                          {fullId}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Center: Search bar */}
              <div className="hidden md:flex flex-1 justify-center max-w-md">
                <div className="relative w-[280px] focus-within:w-[400px] transition-[width] duration-200 ease-out">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="header-search w-full"
                    aria-label="Search"
                  />
                </div>
              </div>

              {/* Right: Notification + Settings */}
              <div className="flex items-center gap-1">
                {/* Mobile search icon — scrolls to / focuses a search overlay */}
                <button
                  className="md:hidden icon-button"
                  aria-label="Search"
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('.header-search')
                    if (el) { el.scrollIntoView({ behavior: 'smooth' }); el.focus() }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-secondary)' }}>
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="header-circle-notification"
                    aria-label="Notifications"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                    <span className="notification-badge" style={{ width: '7px', height: '7px', top: '12px', right: '9px' }} />
                  </button>
                  {showNotifications && (
                    <div
                      className="absolute right-0 mt-1 w-80 rounded-lg"
                      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-dropdown)' }}
                    >
                      <div className="p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <h3 style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)', margin: 0 }}>Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div
                          className="p-3 cursor-pointer hover:bg-[var(--color-bg-surface-2)] transition-colors"
                          style={{ borderBottom: '1px solid var(--color-border)' }}
                        >
                          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', margin: 0 }}>New timetable generated</p>
                          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', marginBottom: 0 }}>2 hours ago</p>
                        </div>
                      </div>
                      <Link
                        href={`/${role}/notifications`}
                        className="block p-3 text-center"
                        style={{ fontSize: '13px', color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)' }}
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
                    className="header-circle-btn"
                    aria-label="Settings"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  </button>
                  {showSettings && (
                    <div
                      className="absolute right-0 mt-1 w-48 rounded-lg"
                      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-dropdown)' }}
                    >
                      <button
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-[var(--color-bg-surface-2)] transition-colors"
                        style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        My Profile
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-[var(--color-bg-surface-2)] transition-colors"
                        style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                        </svg>
                        Preferences
                      </button>
                      <button
                        onClick={() => { setShowSignOutDialog(true); setShowSettings(false) }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-[var(--color-danger-subtle)] transition-colors"
                        style={{ fontSize: '13px', color: 'var(--color-danger)', borderTop: '1px solid var(--color-border)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main
            style={{ backgroundColor: 'var(--color-bg-page)', padding: '24px', minHeight: 'calc(100vh - 56px)' }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <h3
              className="mb-2"
              style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}
            >
              Sign Out
            </h3>
            <p
              className="mb-6"
              style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}
            >
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
