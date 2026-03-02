'use client'

import SidebarNav from './SidebarNav'
import type { NavEntry } from '../hooks/useNavItems'

interface SidebarProps {
  navItems: NavEntry[]
  sidebarOpen: boolean
  mobileOpen: boolean
  isCollapsed: boolean
  pendingApprovals: number
  onCloseMobile: () => void
}

export default function Sidebar({
  navItems,
  sidebarOpen,
  mobileOpen,
  isCollapsed,
  pendingApprovals,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* ══ Mobile backdrop ══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ══ Sidebar aside ═══════════════════════════════════════════════════ */}
      <aside
        className={[
          'fixed left-0 top-0 h-full z-[45] flex flex-col',
          'bg-[#f6f8fc] dark:bg-[#111111]',
          'pt-[68px] md:pt-[76px]',
          'transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mobileOpen ? 'translate-x-0 w-[284px]' : '-translate-x-full w-[284px] md:translate-x-0',
          !mobileOpen && (sidebarOpen ? 'md:w-[284px]' : 'md:w-[72px]'),
        ]
          .filter(Boolean)
          .join(' ')}
      >
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
