'use client'

import Link from 'next/link'
import type { NavItem } from '../hooks/useNavItems'

interface NavItemProps {
  item: NavItem
  active: boolean
  collapsed: boolean
  pendingApprovals: number
  onClick?: () => void
}

export default function NavItemRow({
  item,
  active,
  collapsed,
  pendingApprovals,
  onClick,
}: NavItemProps) {
  const Icon = item.icon
  const showBadge = item.badge && pendingApprovals > 0

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={[
        'relative flex items-center h-[44px]',
        'transition-colors duration-150 select-none',
        collapsed
          ? 'justify-center gap-0 w-[44px] rounded-full mx-auto'
          : 'gap-3 px-[18px] w-[244.8px] rounded-[24px] mx-auto',
        active
          ? 'bg-[#c2e7ff] dark:bg-[#1C2B4A] text-[#001d35] dark:text-[#e3e3e3]'
          : 'text-[#444746] dark:text-[#bdc1c6] hover:bg-[#e8f0fe] dark:hover:bg-[#1a2640]',
      ].join(' ')}
    >
      <span className="relative shrink-0">
        <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#202124]" />
        )}
      </span>
      {/* Visible label — hidden when rail is collapsed */}
      <span
        className={[
          'hhIRA text-[14px] transition-all duration-200',
          active ? 'font-bold text-[#1f1f1f]' : 'font-medium text-[#444746]',
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
