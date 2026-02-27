'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  role: 'admin' | 'faculty' | 'student'
  setShowSignOutDialog: (show: boolean) => void
}

// SVG icon components — consistent size, tintable via `color` CSS property
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  admins: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  faculty: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  students: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  academic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9l10-6 10 6v11a2 2 0 01-2 2H4a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  timetables: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  approvals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  logs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  schedule: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  preferences: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
      <circle cx="2" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="10" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
  signout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

const getNavigationItems = (role: string) => {
  const baseItems = [{ name: 'Dashboard', href: `/${role}/dashboard`, icon: Icons.dashboard }]

  switch (role) {
    case 'admin':
      return [
        ...baseItems,
        { name: 'Admins',      href: '/admin/admins',    icon: Icons.admins },
        { name: 'Faculty',     href: '/admin/faculty',   icon: Icons.faculty },
        { name: 'Students',    href: '/admin/students',  icon: Icons.students },
        { name: 'Academic',    href: '/admin/academic',  icon: Icons.academic },
        { name: 'Timetables',  href: '/admin/timetables', icon: Icons.timetables },
        { name: 'Approvals',   href: '/admin/approvals', icon: Icons.approvals },
        { name: 'Logs',        href: '/admin/logs',      icon: Icons.logs },
      ]
    case 'faculty':
      return [
        ...baseItems,
        { name: 'Schedule',    href: '/faculty/schedule',     icon: Icons.schedule },
        { name: 'Preferences', href: '/faculty/preferences',  icon: Icons.preferences },
      ]
    case 'student':
      return [
        ...baseItems,
        { name: 'Timetable',   href: '/student/timetable',   icon: Icons.timetables },
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
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'var(--color-bg-overlay)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar-drawer fixed top-0 bottom-0 left-0 z-[60] md:z-30 flex flex-col transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          // Mobile drawer always full-width; sidebarCollapsed only applies on desktop
          width: sidebarOpen ? '240px' : sidebarCollapsed ? '60px' : '240px',
          backgroundColor: 'var(--color-sidebar-bg)',
          borderRight: '1px solid var(--color-sidebar-border)',
          transition: 'width 150ms ease-out',
          height: '100dvh',
        }}
      >
        {/* Nav header zone — 56px, mirrors app-header height. Owns branding + sidebar toggle. */}
        <div
          className="flex items-center flex-shrink-0 px-3 gap-2"
          style={{ height: 'var(--header-height)', borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          {/* Logo — always visible, infinite resolution, transparent bg */}
          <Image
            src="/logo2.png"
            alt="Cadence logo"
            width={32}
            height={32}
            style={{ flexShrink: 0, objectFit: 'contain', borderRadius: '50%', mixBlendMode: 'multiply' }}
          />

          {/* Wordmark — hidden only when collapsed on desktop; always shown in mobile drawer */}
          {(!sidebarCollapsed || sidebarOpen) && (
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              Cadence
            </span>
          )}

          {/* Flex spacer — only when icon-only on desktop */}
          {sidebarCollapsed && !sidebarOpen && <div style={{ flex: 1 }} />}

          {/* Collapse chevron — desktop only; tap-outside-backdrop closes mobile drawer */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex icon-button flex-shrink-0"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: '28px', height: '28px' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease-out',
                color: 'var(--color-text-muted)',
              }}
            >
              <polyline points="10 4 6 8 10 12"/>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col p-2 gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {items.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={isActive ? 'nav-link-active' : 'nav-link'}
                title={(sidebarCollapsed && !sidebarOpen) ? item.name : undefined}
                onClick={() => setSidebarOpen(false)}
                style={(sidebarCollapsed && !sidebarOpen) ? { justifyContent: 'center', padding: '8px' } : {}}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? 'var(--color-sidebar-active-text)' : 'var(--color-sidebar-icon)',
                  }}
                >
                  {item.icon}
                </span>
                {(!sidebarCollapsed || sidebarOpen) && (
                  <span className="truncate ml-2">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-sidebar-border)' }} />

        {/* User info + sign-out */}
        <button
          className="p-3 flex items-center gap-2 w-full text-left transition-colors"
          style={(sidebarCollapsed && !sidebarOpen) ? { justifyContent: 'center' } : {}}
          onClick={() => setShowSignOutDialog(true)}
          title="Sign out"
        >
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {(userName || 'U').charAt(0).toUpperCase()}
          </div>
          {(!sidebarCollapsed || sidebarOpen) && (
            <div className="flex-1 min-w-0">
              <p
                className="truncate"
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}
              >
                {userName || (role === 'admin' ? 'Admin User' : role === 'faculty' ? 'Faculty User' : 'Student User')}
              </p>
              <p
                className="truncate"
                style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}
              >
                {userEmail || `${role}@cadence.edu`}
              </p>
            </div>
          )}
          {(!sidebarCollapsed || sidebarOpen) && (
            <span style={{ flexShrink: 0, color: 'var(--color-text-muted)' }}>
              {Icons.signout}
            </span>
          )}
        </button>


      </div>
    </>
  )
}
