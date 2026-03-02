'use client'

import { usePathname } from 'next/navigation'
import { isNavGroup, type NavEntry } from '../hooks/useNavItems'
import NavItemRow from './NavItem'
import NavGroupRow from './NavGroup'

interface SidebarNavProps {
  navItems: NavEntry[]
  collapsed: boolean
  pendingApprovals: number
  onLinkClick: () => void
}

export default function SidebarNav({
  navItems,
  collapsed,
  pendingApprovals,
  onLinkClick,
}: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
      {navItems.map((entry) => {
        if (isNavGroup(entry)) {
          return (
            <NavGroupRow
              key={entry.base}
              group={entry}
              pathname={pathname}
              collapsed={collapsed}
              onLinkClick={onLinkClick}
            />
          )
        }
        const base   = entry.activeBase ?? entry.href
        const active = pathname === entry.href || pathname.startsWith(base + '/')
        return (
          <NavItemRow
            key={entry.href}
            item={entry}
            active={active}
            collapsed={collapsed}
            pendingApprovals={pendingApprovals}
            onClick={onLinkClick}
          />
        )
      })}
    </nav>
  )
}
