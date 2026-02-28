'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Menu,
  Search,
  Mic,
  Settings,
  Bell,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  X,
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2,
  FileText,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

// ─── Nav definitions ──────────────────────────────────────────────────────────

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',          href: '/admin/dashboard',        icon: LayoutDashboard },
  { label: 'Timetables',         href: '/admin/timetables',       icon: CalendarDays },
  { label: 'Academic Structure', href: '/admin/academic/schools', icon: BookOpen },
  { label: 'Faculty',            href: '/admin/faculty',          icon: Users },
  { label: 'Students',           href: '/admin/students',         icon: GraduationCap },
  { label: 'Approvals',          href: '/admin/approvals',        icon: CheckCircle2, badge: true },
  { label: 'Logs',               href: '/admin/logs',             icon: FileText },
]

const FACULTY_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/faculty/dashboard',   icon: LayoutDashboard },
  { label: 'My Schedule', href: '/faculty/schedule',    icon: Calendar },
  { label: 'Preferences', href: '/faculty/preferences', icon: SlidersHorizontal },
]

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/student/dashboard',  icon: LayoutDashboard },
  { label: 'My Timetable', href: '/student/timetable',  icon: CalendarDays },
]

const NAV_MAP: Record<string, NavItem[]> = {
  admin: ADMIN_NAV,
  faculty: FACULTY_NAV,
  student: STUDENT_NAV,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic hue from a string → Google-style avatar colour. */
function seedHsl(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},55%,45%)`
}

/** Resolve display name + two-letter initials from user object. */
function resolveUser(u: {
  username: string
  email?: string
  first_name?: string
  last_name?: string
}) {
  const full =
    [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username
  const initials = full
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return { full, initials }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const { initials } = resolveUser({ username: name })
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.375,
        background: seedHsl(name),
      }}
    >
      {initials}
    </span>
  )
}

// ─── NavItemRow ───────────────────────────────────────────────────────────────

function NavItemRow({
  item,
  active,
  collapsed,
  pendingApprovals,
  onClick,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  pendingApprovals: number
  onClick?: () => void
}) {
  const Icon = item.icon
  const showBadge = item.badge && pendingApprovals > 0

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={[
        'relative flex items-center gap-3 rounded-[24px] h-10 my-0.5',
        'transition-colors duration-150 select-none',
        collapsed ? 'justify-center w-10 mx-auto px-0' : 'px-4 mx-2',
        active
          ? 'bg-[#c2e7ff] dark:bg-[#004a77] font-semibold text-[#001d35] dark:text-white'
          : 'text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]',
      ].join(' ')}
    >
      <span className="relative shrink-0">
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#202124]" />
        )}
      </span>
      <span
        className={[
          'text-sm whitespace-nowrap transition-all duration-200',
          collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
        ].join(' ')}
      >
        {item.label}
      </span>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const pathname  = usePathname()
  const router    = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(true)    // desktop expanded
  const [mobileOpen,   setMobileOpen]   = useState(false)   // mobile drawer
  const [profileOpen,  setProfileOpen]  = useState(false)   // avatar dropdown
  const [showSignOut,  setShowSignOut]  = useState(false)   // confirm dialog
  const [searchOpen,   setSearchOpen]   = useState(false)   // mobile search overlay
  const [pendingApprovals]              = useState(0)        // extend with SWR if needed
  const [mounted,      setMounted]      = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const role      = (user?.role ?? 'student') as 'admin' | 'faculty' | 'student'
  const navItems  = NAV_MAP[role] ?? STUDENT_NAV
  const { full: displayName } = resolveUser(
    user ?? { username: 'User', email: '', first_name: '', last_name: '' }
  )
  const rolePill = { admin: 'Admin', faculty: 'Faculty', student: 'Student' }[role]

  // ── Mount / responsive init ────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const init = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
        setMobileOpen(false)
      }
    }
    init()
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
      if (window.innerWidth < 1024) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Close profile dropdown on outside click ────────────────────────────────
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  // ── Auto-focus search input when mobile overlay opens ─────────────────────
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60)
  }, [searchOpen])

  // ── Hamburger ─────────────────────────────────────────────────────────────
  const handleHamburger = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((v) => !v)
    } else {
      setSidebarOpen((v) => !v)
    }
  }, [])

  // ── Sign-out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setShowSignOut(false)
    await logout()
    router.push('/login')
  }

  // ── Content area left margin transitions with sidebar width ───────────────
  // SSR-safe: render SSR-default (expanded) then update after mount.
  const contentMarginCls = mounted
    ? [
        'transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        sidebarOpen ? 'md:ml-[256px]' : 'md:ml-[72px]',
      ].join(' ')
    : 'md:ml-[256px]'

  const collapsed = !sidebarOpen && !mobileOpen

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#111111] font-sans">

      {/* ══════════════════════════════════════════════════════════
          HEADER  (fixed, full-width, z-50)
      ══════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-14 md:h-16 px-2 md:px-4 gap-1 bg-white dark:bg-[#202124] border-b border-[#e0e0e0] dark:border-[#3c4043]">

        {/* Left: hamburger + wordmark */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleHamburger}
            aria-label="Toggle sidebar"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <Menu size={20} />
          </button>

          <Link
            href={`/${role}/dashboard`}
            className="flex items-center gap-1 px-1 select-none"
          >
            <span className="font-bold text-sm leading-none tracking-tight">
              <span className="text-[#4285F4]">S</span>
              <span className="text-[#EA4335]">I</span>
              <span className="text-[#FBBC04]">H</span>
              <span className="text-[#34A853]">28</span>
            </span>
          </Link>
        </div>

        {/* Centre: pill search bar — hidden on mobile */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <div className="relative w-full max-w-[720px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5f6368] dark:text-[#9aa0a6]">
              <Search size={18} />
            </span>
            <input
              type="search"
              placeholder="Search timetables, faculty, rooms…"
              className={[
                'w-full h-11 pl-[3rem] pr-12 rounded-[24px] text-sm outline-none',
                'bg-[#f1f3f4] dark:bg-[#303134]',
                'text-[#202124] dark:text-[#e8eaed]',
                'placeholder:text-[#9aa0a6]',
                'border border-transparent',
                'focus:bg-white dark:focus:bg-[#202124]',
                'focus:border-[#dfe1e5] dark:focus:border-[#5f6368]',
                'focus:shadow-[0_1px_6px_rgba(32,33,36,0.28)]',
                'transition-[background-color,box-shadow,border-color] duration-150',
              ].join(' ')}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5f6368] dark:text-[#9aa0a6]">
              <Mic size={18} />
            </span>
          </div>
        </div>

        {/* Right: search-icon (mobile) + settings + bell + avatar */}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <Search size={20} />
          </button>

          {/* Settings */}
          <button
            aria-label="Settings"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <Settings size={20} />
          </button>

          {/* Bell */}
          <button
            aria-label="Notifications"
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <Bell size={20} />
            {pendingApprovals > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-[1.5px] ring-white dark:ring-[#202124]" />
            )}
          </button>

          {/* Avatar + dropdown */}
          <div className="relative ml-1" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Account menu"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-1"
            >
              <Avatar name={displayName} size={32} />
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-2xl shadow-xl bg-white dark:bg-[#292a2d] border border-[#e0e0e0] dark:border-[#3c4043] overflow-hidden z-[60]">

                {/* User info header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e0e0e0] dark:border-[#3c4043]">
                  <Avatar name={displayName} size={40} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed] truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate">
                      {user?.email ?? ''}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#444746] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors text-left">
                    <UserIcon size={16} />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#444746] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors text-left"
                  >
                    {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </button>
                </div>

                <div className="h-px bg-[#e0e0e0] dark:bg-[#3c4043]" />

                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); setShowSignOut(true) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors text-left"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MOBILE SEARCH OVERLAY
      ══════════════════════════════════════════════════════════ */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-[#202124] flex flex-col">
          <div className="flex items-center h-14 px-2 gap-1 border-b border-[#e0e0e0] dark:border-[#3c4043]">
            <button
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors shrink-0"
            >
              <X size={20} />
            </button>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search timetables, faculty, rooms…"
              className="flex-1 h-10 px-2 text-sm bg-transparent outline-none text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MOBILE BACKDROP (behind open drawer)
      ══════════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════════ */}
      <aside
        className={[
          'fixed left-0 top-0 h-full z-[45] flex flex-col',
          'bg-white dark:bg-[#202124]',
          'border-r border-[#e0e0e0] dark:border-[#3c4043]',
          // Below header on desktop/tablet; full-height drawer on mobile
          'pt-14 md:pt-16',
          // Mobile: off-canvas (translateX) / Desktop: width transition
          'transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          // Mobile open/closed
          mobileOpen ? 'translate-x-0 w-[256px]' : '-translate-x-full w-[256px] md:translate-x-0',
          // Desktop width: depends on sidebarOpen; mobile open overrides to 256px
          !mobileOpen && (sidebarOpen ? 'md:w-[256px]' : 'md:w-[72px]'),
        ].filter(Boolean).join(' ')}
      >
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <NavItemRow
                key={item.href}
                item={item}
                active={active}
                collapsed={collapsed}
                pendingApprovals={pendingApprovals}
                onClick={() => { if (mobileOpen) setMobileOpen(false) }}
              />
            )
          })}
        </nav>

        {/* Role badge at bottom */}
        <div
          className={[
            'shrink-0 py-4 flex',
            collapsed ? 'justify-center px-0' : 'px-4',
          ].join(' ')}
        >
          {collapsed ? (
            <span
              title={rolePill}
              className="w-8 h-8 rounded-full bg-[#e8f0fe] dark:bg-[#1a3a5c] text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center"
            >
              <UserIcon size={14} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f0fe] dark:bg-[#1a3a5c] text-[#1a73e8] dark:text-[#8ab4f8] text-xs font-semibold select-none">
              <UserIcon size={12} />
              {rolePill}
            </span>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════════════════════════ */}
      <main
        className={[
          contentMarginCls,
          'mt-14 md:mt-16',
          'min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)]',
          'p-3 md:p-6',
          '[&>*]:rounded-2xl',
        ].join(' ')}
      >
        {children}
      </main>

      {/* ══════════════════════════════════════════════════════════
          SIGN-OUT CONFIRMATION DIALOG
      ══════════════════════════════════════════════════════════ */}
      {showSignOut && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSignOut(false)}
            aria-hidden="true"
          />

          {/* Dialog card */}
          <div className="relative w-full max-w-sm bg-white dark:bg-[#292a2d] rounded-2xl shadow-2xl border border-[#e0e0e0] dark:border-[#3c4043] p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <LogOut size={18} className="text-red-600 dark:text-red-400" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#202124] dark:text-[#e8eaed]">
                  Sign out?
                </h2>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                  Are you sure you want to sign out of SIH28?
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSignOut(false)}
                className="px-5 py-2 rounded-full text-sm font-medium text-[#444746] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-5 py-2 rounded-full text-sm font-medium bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
