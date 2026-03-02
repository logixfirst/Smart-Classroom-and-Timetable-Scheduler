'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import ContentArea from './Content/ContentArea'
import { useSidebarState } from './hooks/useSidebarState'
import { useNavItems } from './hooks/useNavItems'

// ─── AppShell ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()

  const { sidebarOpen, mobileOpen, isCollapsed, toggle, closeMobile } = useSidebarState()
  const [showSignOut, setShowSignOut] = useState(false)
  const [pendingApprovals] = useState(0) // extend with SWR when needed

  // Derive role from auth context; fall back to pathname so nav is correct
  // even while the user API call is in-flight.
  const role: 'admin' | 'faculty' | 'student' = (() => {
    if (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'student')
      return user.role
    if (pathname.startsWith('/admin'))   return 'admin'
    if (pathname.startsWith('/faculty')) return 'faculty'
    return 'student'
  })()

  const navItems = useNavItems(role)

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.username ||
    'User'

  const rolePill = { admin: 'Admin', faculty: 'Faculty', student: 'Student' }[role]

  const handleSignOut = async () => {
    setShowSignOut(false)
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] dark:bg-[#111111] font-sans">

      <Header
        role={role}
        onMenuClick={toggle}
        displayName={displayName}
        user={user}
        rolePill={rolePill}
        pendingApprovals={pendingApprovals}
        onSignOut={() => setShowSignOut(true)}
      />

      <Sidebar
        navItems={navItems}
        sidebarOpen={sidebarOpen}
        mobileOpen={mobileOpen}
        isCollapsed={isCollapsed}
        pendingApprovals={pendingApprovals}
        onCloseMobile={closeMobile}
      />

      <ContentArea sidebarOpen={sidebarOpen}>
        {children}
      </ContentArea>

      {/* ══ Sign-out confirmation dialog ════════════════════════════════════ */}
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
