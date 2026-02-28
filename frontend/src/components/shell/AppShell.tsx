'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Search,
  Mic,
  Bell,
  LogOut,
  Sun,
  Moon,
  Plus,
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
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: boolean
  activeBase?: string   // match any sub-path when href is a deep link
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

// ─── Nav definitions ──────────────────────────────────────────────────────────

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',          href: '/admin/dashboard',        icon: LayoutDashboard },
  { label: 'Admins',             href: '/admin/admins',           icon: ShieldCheck },
  { label: 'Faculty',            href: '/admin/faculty',          icon: Users },
  { label: 'Students',           href: '/admin/students',         icon: GraduationCap },
  { label: 'Academic',           href: '/admin/academic/schools', icon: BookOpen,      activeBase: '/admin/academic' },
  { label: 'Timetables',         href: '/admin/timetables',       icon: CalendarDays },
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
  admin:   ADMIN_NAV,
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
  // Google-style: single letter — first char of first_name, fallback to username
  const initials = (u.first_name?.[0] ?? u.username[0]).toUpperCase()
  return { full, initials }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const { initials } = resolveUser({ username: name })
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.44, background: seedHsl(name) }}
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
        'relative flex items-center h-10 my-0.5',
        'transition-colors duration-150 select-none',
        collapsed
          ? 'justify-center gap-0 w-10 rounded-full mx-auto'
          : 'gap-3 px-4 mx-2 rounded-[24px]',
        active
          ? 'bg-[#E8F0FE] dark:bg-[#1C2B4A] font-semibold text-[#1A73E8] dark:text-[#8AB4F8]'
          : 'text-[#444746] dark:text-[#bdc1c6] hover:bg-[#EEF3FD] dark:hover:bg-[#1a2640]',
      ].join(' ')}
    >
      <span className="relative shrink-0">
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#202124]" />
        )}
      </span>
      {/* Visible label — hidden when rail is collapsed */}
      <span
        className={[
          'text-sm whitespace-nowrap transition-all duration-200',
          collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
        ].join(' ')}
      >
        {item.label}
      </span>
      {/* Screen-reader label always present so collapsed rail is accessible */}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const pathname = usePathname()
  const router   = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(true)   // desktop expanded
  const [mobileOpen,   setMobileOpen]   = useState(false)  // mobile drawer
  const [profileOpen,  setProfileOpen]  = useState(false)  // avatar dropdown
  const [showSignOut,  setShowSignOut]  = useState(false)  // confirm dialog
  const [searchOpen,   setSearchOpen]   = useState(false)  // mobile search overlay
  const [pendingApprovals]              = useState(0)       // extend with SWR if needed
  const [mounted,      setMounted]      = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  // Prefer the role from the auth context; fall back to pathname so the correct
  // nav is shown even while the user API call is still in-flight or fails.
  const role: 'admin' | 'faculty' | 'student' = (() => {
    if (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'student')
      return user.role
    if (pathname.startsWith('/admin'))   return 'admin'
    if (pathname.startsWith('/faculty')) return 'faculty'
    return 'student'
  })()
  const navItems   = NAV_MAP[role] ?? ADMIN_NAV
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

  // ── Content area left margin — SSR-safe ─────────────────────────────────
  const contentMarginCls = mounted
    ? [
        'transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        sidebarOpen ? 'md:ml-[256px]' : 'md:ml-[72px]',
      ].join(' ')
    : 'md:ml-[256px]'

  const collapsed = !sidebarOpen && !mobileOpen

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f6f8fc] dark:bg-[#111111] font-sans">

      {/* ══════════════════════════════════════════════════════════
          HEADER  (fixed, full-width, z-50)
      ══════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-14 md:h-16 px-2 md:px-4 gap-1 bg-[#f6f8fc] dark:bg-[#111111]">

        {/* Left: hamburger + logo + wordmark — fixed natural width, never shifts search bar */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleHamburger}
            aria-label="Toggle sidebar"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="3" y1="5"  x2="17" y2="5"/>
              <line x1="3" y1="10" x2="17" y2="10"/>
              <line x1="3" y1="15" x2="17" y2="15"/>
            </svg>
          </button>

          <Link href={`/${role}/dashboard`} className="flex items-center gap-2 px-1 select-none">
            <Image
              src="/logo2.png"
              alt="Cadence"
              width={32}
              height={32}
              className="rounded-full object-contain"
              style={{ mixBlendMode: 'multiply', flexShrink: 0 }}
            />
            <span
              className="hidden sm:inline"
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #202124)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}
            >
              Cadence
            </span>
          </Link>
        </div>

        {/* Search bar — absolutely centred in the header, unaffected by sidebar */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-full max-w-[584px] px-2">
          <div className="relative w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5f6368] dark:text-[#9aa0a6]">
              <Search size={18} />
            </span>
            <input
              type="search"
              placeholder="Search timetables, faculty, rooms…"
              className={[
                'w-full h-11 pl-[3rem] pr-12 rounded-[24px] text-sm outline-none',
                'bg-[#e8eaed] dark:bg-[#303134]',
                'hover:bg-[#dadce0] dark:hover:bg-[#3c4043]',
                'focus:bg-white dark:focus:bg-[#202124]',
                'text-[#202124] dark:text-[#e8eaed]',
                'placeholder:text-[#80868b]',
                'border border-transparent',
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

        {/* Right: mobile search + Generate Timetable CTA + bell + avatar */}
        <div className="flex items-center gap-2 ml-auto shrink-0">

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <Search size={20} />
          </button>

          {/* Generate Timetable — primary CTA, admin only */}
          {role === 'admin' && (
            <Link
              href="/admin/timetables/new"
              aria-label="Generate new timetable"
              className="flex items-center gap-1.5 h-9 px-4 rounded-[20px] text-sm font-medium shrink-0 transition-colors bg-[#1A73E8] hover:bg-[#1765CC] active:bg-[#185ABC] text-white"
            >
              <Plus size={15} strokeWidth={2.2} />
              <span className="hidden sm:inline">Generate Timetable</span>
            </Link>
          )}

          {/* Bell — 4px gap from CTA */}
          <button
            aria-label="Notifications"
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
          >
            <Bell size={20} />
            {pendingApprovals > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-[1.5px] ring-white dark:ring-[#202124]" />
            )}
          </button>

          {/* Avatar + dropdown — 2px gap from bell */}
          <div className="relative ml-0.5" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Account menu"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-1"
            >
              <Avatar name={displayName} size={36} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] rounded-3xl shadow-2xl bg-[#f6f8fc] dark:bg-[#111111] border border-[#e0e0e0] dark:border-[#3c4043] overflow-hidden z-[60]">

                {/* Header: email + close button */}
                <div className="flex items-right justify-between px-4 pt-3.5 pb-2.5">
                  <button
                    onClick={() => setProfileOpen(false)}
                    className="w-7 h-7 shrink-0 ml-2 flex items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Large avatar + greeting */}
                <div className="flex flex-col items-center px-4 pb-5 pt-1">
                  <div className="relative mb-3">
                    <Avatar name={displayName} size={72} />
                    <span aria-label="Change profile photo" className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center bg-white dark:bg-[#3c4043] border border-[#e0e0e0] dark:border-[#5f6368] shadow-sm">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[#5f6368] dark:text-[#9aa0a6]">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-1-1H7.586l-1 1H4zm8 4a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-[20px] font-normal text-[#202124] dark:text-[#e8eaed] mb-0.5">
                    Hi, {user?.first_name || displayName.split(' ')[0]}!
                  </p>
                  <p className="text-[13px] text-[#5f6368] dark:text-[#9aa0a6] mb-4">
                    {user?.email ?? ''}
                  </p>
                </div>

                <div className="h-px bg-[#e0e0e0] dark:bg-[#3c4043]" />

                {/* Two-column action row */}
                <div className="grid grid-cols-2 gap-2 p-3">
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-medium border border-[#e0e0e0] dark:border-[#3c4043] text-[#444746] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
                    <UserIcon size={15} />
                    Profile
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); setShowSignOut(true) }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-medium border border-[#e0e0e0] dark:border-[#3c4043] text-[#444746] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>

                <div className="h-px bg-[#e0e0e0] dark:bg-[#3c4043]" />

                {/* More section */}
                <div className="py-1">
                  <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">
                    More from Cadence
                  </p>
                  <button
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#444746] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors text-left"
                  >
                    {mounted && resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {mounted && resolvedTheme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                  </button>
                  <div className="flex items-center gap-3 px-4 py-2 pb-3">
                    <ShieldCheck size={16} className="text-[#5f6368] dark:text-[#9aa0a6] shrink-0" />
                    <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Signed in as</span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F0FE] dark:bg-[#1C2B4A] text-[#1A73E8] dark:text-[#8AB4F8]">
                      {rolePill}
                    </span>
                  </div>
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
          MOBILE BACKDROP
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
          'bg-[#f6f8fc] dark:bg-[#111111]',
          'pt-14 md:pt-16',
          'transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mobileOpen ? 'translate-x-0 w-[256px]' : '-translate-x-full w-[256px] md:translate-x-0',
          !mobileOpen && (sidebarOpen ? 'md:w-[256px]' : 'md:w-[72px]'),
        ].filter(Boolean).join(' ')}
      >
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {navItems.map((item) => {
            const base   = item.activeBase ?? item.href
            const active = pathname === item.href || pathname.startsWith(base + '/')
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


      </aside>

      {/* ══════════════════════════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════════════════════════ */}
      <main
        className={[
          contentMarginCls,
          'mt-14 md:mt-16',
          'mx-2 md:mx-3 mb-2 md:mb-3',
          'min-h-[calc(100vh-58px)] md:min-h-[calc(100vh-68px)]',
          'rounded-2xl',
          'bg-white dark:bg-[#1e1e1e]',
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
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSignOut(false)}
            aria-hidden="true"
          />
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
                  Are you sure you want to sign out of Cadence?
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
