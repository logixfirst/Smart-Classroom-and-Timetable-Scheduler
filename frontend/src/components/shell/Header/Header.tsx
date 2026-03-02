'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Bell } from 'lucide-react'
import Avatar from '@/components/shared/Avatar'
import ProfileDropdown from '../ProfileDropdown'
import SearchBar from './SearchBar'
import NewMenu from './NewMenu'

interface HeaderUser {
  email?: string
  first_name?: string
}

interface HeaderProps {
  role: 'admin' | 'faculty' | 'student'
  onMenuClick: () => void
  displayName: string
  user: HeaderUser | null
  rolePill: string
  pendingApprovals: number
  /** Called when the user confirms sign-out from the profile dropdown */
  onSignOut: () => void
}

/**
 * Header — fixed full-width app bar (3 zones matching Google Drive layout).
 *
 * Zone 1 — 284px wide on desktop: hamburger + logo
 * Zone 2 — flex-1: desktop search bar (+ mobile search overlay portal)
 * Zone 3 — shrink-0: mobile search icon, + New (admin), bell, avatar
 *
 * Z-index: z-50 (matches original AppShell)
 */
export default function Header({
  role,
  onMenuClick,
  displayName,
  user,
  rolePill,
  pendingApprovals,
  onSignOut,
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [mounted,     setMounted]     = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)

  // SSR-safe mount flag (used by ProfileDropdown for theme toggle)
  useEffect(() => { setMounted(true) }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  return (
    <header
      suppressHydrationWarning
      className="fixed top-0 left-0 right-0 z-50 flex items-center h-14 md:h-16 bg-[#f6f8fc] dark:bg-[#111111]"
    >
      {/* ── Zone 1: Left — always 284px on desktop, natural width on mobile ── */}
      <div className="flex items-center gap-1 shrink-0 pl-2 md:pl-3 md:w-[284px]">
        <button
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          className="w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <line x1="3" y1="5"  x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </button>

        <Link href={`/${role}/dashboard`} className="flex items-center gap-2 px-1 select-none">
          <Image
            src="/logo2.png"
            alt="Cadence"
            width={44}
            height={44}
            className="rounded-full object-contain"
            style={{ mixBlendMode: 'multiply', flexShrink: 0 }}
          />
          <span className="hidden sm:inline-flex items-center w-[92.75px] h-[48px] text-[22px] font-normal [color:var(--color-text-primary,#202124)] tracking-[-0.01em] overflow-hidden">
            Cadence
          </span>
        </Link>
      </div>

      {/* ── Zone 2: Search bar — renders desktop bar + mobile overlay ─────── */}
      <SearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Zone 3: Right actions ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0 pr-2 md:pr-4">

        {/* Mobile search icon (triggers SearchBar overlay) */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors"
        >
          <Search size={20} />
        </button>

        {/* + New dropdown — admin only */}
        {role === 'admin' && <NewMenu />}

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

        {/* Avatar + profile dropdown */}
        <div className="relative ml-0.5" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Account menu"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-1"
          >
            <Avatar name={displayName} size={36} />
          </button>

          {profileOpen && (
            <ProfileDropdown
              user={user}
              displayName={displayName}
              role={role}
              rolePill={rolePill}
              mounted={mounted}
              onClose={() => setProfileOpen(false)}
              onSignOut={() => {
                setProfileOpen(false)
                onSignOut()
              }}
            />
          )}
        </div>
      </div>
    </header>
  )
}
