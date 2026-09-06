'use client'

import Image from 'next/image'
import Link from 'next/link'
import SidebarNav from './SidebarNav'
import type { NavEntry } from '../hooks/useNavItems'

interface SidebarProps {
  navItems: NavEntry[]
  sidebarOpen: boolean
  mobileOpen: boolean
  isCollapsed: boolean
  pendingApprovals: number
  role: 'admin' | 'faculty' | 'student'
  onCloseMobile: () => void
}

export default function Sidebar({
  navItems,
  sidebarOpen,
  mobileOpen,
  isCollapsed,
  pendingApprovals,
  role,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* ══ Mobile backdrop ══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[51] bg-black/40"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ══ Sidebar aside ═══════════════════════════════════════════════════ */}
      <aside
        className={[
          'fixed left-0 top-0 h-full flex flex-col',
          mobileOpen ? 'z-[55]' : 'z-[45]',        /* above header (z-50) when drawer open */
          '[background:var(--color-sidebar-bg)]',
          /* no pt-* — brand strip below acts as the top spacer */
          'transition-[width,transform] duration-100 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mobileOpen ? 'translate-x-0 w-[284px]' : '-translate-x-full w-[284px] md:translate-x-0',
          !mobileOpen && (sidebarOpen ? 'md:w-[284px]' : 'md:w-[72px]'),
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* ── Brand strip ───────────────────────────────────────────────────
            Height matches the top app bar so nav items always start below it.
            Content visible only on mobile — desktop header already shows the
            logo. When the drawer is open isCollapsed=false so brand renders.  */}
        <div className="flex items-center h-14 md:h-16 shrink-0 overflow-hidden pl-3">
          {mobileOpen && (
            <Link
              href={`/${role}/dashboard`}
              onClick={onCloseMobile}
              className="md:hidden flex items-center gap-2 px-1 select-none"
              aria-label="Cadence home"
            >
              <Image
                src="/logo2.png"
                alt=""
                width={40}
                height={40}
                className="rounded-full object-contain shrink-0 mix-blend-multiply dark:mix-blend-screen"
                aria-hidden="true"
              />
              <span className="text-[22px] font-normal text-[#202124] dark:text-[#e8eaed] tracking-[-0.01em] whitespace-nowrap leading-none">
                Cadence
              </span>
            </Link>
          )}
        </div>

        <SidebarNav
          navItems={navItems}
          collapsed={isCollapsed}
          pendingApprovals={pendingApprovals}
          onLinkClick={onCloseMobile}
        />
      </aside>
    </>
  )
}
