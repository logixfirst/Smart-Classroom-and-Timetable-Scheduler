'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { NavGroup } from '../hooks/useNavItems'

interface NavGroupProps {
  group: NavGroup
  pathname: string
  collapsed: boolean
  onLinkClick?: () => void
}

export default function NavGroupRow({
  group,
  pathname,
  collapsed,
  onLinkClick,
}: NavGroupProps) {
  const isChildActive = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/')
  )
  const [open, setOpen] = useState(isChildActive)

  // Auto-expand when navigating into this group
  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  const Icon = group.icon

  // Rail (collapsed sidebar): show only the icon; clicking goes to first child
  if (collapsed) {
    return (
      <Link
        href={group.children[0]?.href ?? '#'}
        onClick={onLinkClick}
        title={group.label}
        className={[
          'relative flex items-center justify-center w-[44px] h-[44px] rounded-full mx-auto transition-colors duration-150 select-none',
          isChildActive
            ? 'bg-[#c2e7ff] dark:bg-[#1C2B4A] text-[#001d35] dark:text-[#8AB4F8]'
            : 'text-[#444746] dark:text-[#bdc1c6] hover:bg-[#e8f0fe] dark:hover:bg-[#1a2640]',
        ].join(' ')}
      >
        <Icon size={20} strokeWidth={isChildActive ? 2.2 : 1.8} />
        <span className="sr-only">{group.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Group header button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          'w-[244.8px] flex items-center gap-3 px-[18px] h-[44px] rounded-[24px] transition-colors duration-150 select-none relative',
          isChildActive && !open
            ? 'bg-[#c2e7ff] dark:bg-[#1C2B4A] text-[#001d35] dark:text-[#e3e3e3]'
            : 'text-[#444746] dark:text-[#bdc1c6] hover:bg-[#e8f0fe] dark:hover:bg-[#1a2640]',
        ].join(' ')}
      >
        {/* Chevron sits to the extreme left, same row */}
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`absolute left-1 shrink-0 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
        <Icon size={20} strokeWidth={isChildActive ? 2.4 : 1.8} className="shrink-0" />
        <span
          className={[
            'hhIRA text-[14px] text-left',
            isChildActive ? 'font-bold text-[#1f1f1f]' : 'font-medium text-[#444746]',
          ].join(' ')}
        >
          {group.label}
        </span>
      </button>

      {/* Sub-items — stacked below the group header */}
      {open && (
        <div className="w-[244.8px] flex flex-col pl-8 mt-0.5">
          {group.children.map((child) => {
            const active =
              pathname === child.href || pathname.startsWith(child.href + '/')
            const ChildIcon = child.icon
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onLinkClick}
                className={[
                  'flex items-center gap-2.5 h-9 px-3 rounded-[20px] text-sm transition-colors duration-150 select-none',
                  active
                    ? 'bg-[#c2e7ff] dark:bg-[#1C2B4A] text-[#001d35] dark:text-[#e3e3e3]'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#e8f0fe] dark:hover:bg-[#1a2640]',
                ].join(' ')}
              >
                <ChildIcon size={15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                <span
                  className={[
                    'hhIRA text-[14px]',
                    active ? 'font-bold text-[#1f1f1f]' : 'font-medium text-[#444746]',
                  ].join(' ')}
                >
                  {child.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
