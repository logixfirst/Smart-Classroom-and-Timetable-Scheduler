'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

interface HeaderProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setShowSignOutDialog: (show: boolean) => void
}

export default function Header({
  sidebarOpen,
  sidebarCollapsed,
  setSidebarOpen,
  setSidebarCollapsed,
  setShowSignOutDialog,
}: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [userName, setUserName] = useState('U')
  const [userEmail, setUserEmail] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)
  const searchOverlayRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.full_name || user.username || user.name || 'U')
        setUserEmail(user.email || '')
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    if (showProfile) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfile])

  useEffect(() => {
    if (showSearchOverlay && searchOverlayRef.current) {
      searchOverlayRef.current.focus()
    }
  }, [showSearchOverlay])

  const initials = (userName || 'U').charAt(0).toUpperCase()

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-3 gap-2 md:gap-3"
        style={{
          height: '64px',
          backgroundColor: 'var(--color-header-bg, #ffffff)',
          borderBottom: '1px solid var(--color-border, #e0e0e0)',
        }}
      >
        {/* LEFT: hamburger + logo + name */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              if (window.innerWidth >= 768) {
                setSidebarCollapsed(!sidebarCollapsed)
              } else {
                setSidebarOpen(!sidebarOpen)
              }
            }}
            className="header-circle-btn"
            title="Toggle menu"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5"/>
              <line x1="3" y1="10" x2="17" y2="10"/>
              <line x1="3" y1="15" x2="17" y2="15"/>
            </svg>
          </button>

          <Image
            src="/logo2.png"
            alt="Cadence logo"
            width={36}
            height={36}
            style={{ objectFit: 'contain', borderRadius: '50%', mixBlendMode: 'multiply', flexShrink: 0 }}
          />

          <span
            className="hidden sm:inline"
            style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}
          >
            Cadence
          </span>
        </div>

        {/* CENTER: pill search bar — desktop only */}
        <div className="hidden md:flex flex-1 justify-center">
          <div
            className="flex items-center gap-2 px-4"
            style={{
              maxWidth: '720px',
              width: '100%',
              height: '44px',
              borderRadius: '24px',
              background: 'var(--color-search-bg, #f1f3f4)',
              border: '1px solid transparent',
              transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Search..."
              className="flex-1 bg-transparent outline-none border-none text-sm"
              style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-primary)' }}
              onFocus={e => {
                const p = e.currentTarget.parentElement!
                p.style.background = 'var(--color-bg-surface, #ffffff)'
                p.style.borderColor = '#dadce0'
                p.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'
              }}
              onBlur={e => {
                const p = e.currentTarget.parentElement!
                p.style.background = 'var(--color-search-bg, #f1f3f4)'
                p.style.borderColor = 'transparent'
                p.style.boxShadow = 'none'
              }}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
        </div>

        {/* RIGHT: mobile search + notifications + avatar */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto md:ml-0">
          {/* Mobile search icon */}
          <button
            className="md:hidden header-circle-btn"
            aria-label="Search"
            onClick={() => setShowSearchOverlay(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Notifications */}
          <button className="header-circle-notification" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span className="notification-badge">3</span>
          </button>

          {/* Avatar + profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              aria-label="Account menu"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#1a73e8',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initials}
            </button>

            {showProfile && (
              <div
                className="absolute right-0"
                style={{
                  top: '48px',
                  minWidth: '280px',
                  borderRadius: '12px',
                  background: 'var(--color-bg-surface, #ffffff)',
                  border: '1px solid var(--color-border, #e0e0e0)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  zIndex: 9999,
                  overflow: 'hidden',
                }}
              >
                {/* User info */}
                <div
                  className="flex flex-col items-center px-5 py-4 gap-1"
                  style={{ borderBottom: '1px solid var(--color-border, #e0e0e0)' }}
                >
                  <div
                    style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: '#1a73e8', color: '#fff',
                      fontSize: '20px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    {initials}
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {userName}
                  </p>
                  {userEmail && (
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {userEmail}
                    </p>
                  )}
                </div>

                {/* Menu */}
                <div className="py-1">
                  <button
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}
                  >
                    <span>👤</span> My Profile
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}
                  >
                    <span>⚙️</span> Settings
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    <span>🌙</span> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>

                {/* Sign out */}
                <div style={{ borderTop: '1px solid var(--color-border, #e0e0e0)' }}>
                  <button
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-[#fce8e6] dark:hover:bg-[rgba(255,68,68,0.1)]"
                    style={{ fontSize: '13px', color: '#d93025' }}
                    onClick={() => { setShowSignOutDialog(true); setShowProfile(false) }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile search overlay — drops down below header */}
      {showSearchOverlay && (
        <div
          className="fixed left-0 right-0 z-[60] md:hidden"
          style={{
            top: '64px',
            background: 'var(--color-bg-surface, #ffffff)',
            borderBottom: '1px solid var(--color-border, #e0e0e0)',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4"
            style={{
              height: '44px',
              borderRadius: '24px',
              background: 'var(--color-search-bg, #f1f3f4)',
              border: '1px solid #dadce0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchOverlayRef}
              type="search"
              placeholder="Search..."
              className="flex-1 bg-transparent outline-none border-none text-sm"
              style={{ color: 'var(--color-text-primary)' }}
              onKeyDown={e => e.key === 'Escape' && setShowSearchOverlay(false)}
            />
            <button
              onClick={() => setShowSearchOverlay(false)}
              aria-label="Close search"
              style={{ flexShrink: 0, color: '#9aa0a6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
