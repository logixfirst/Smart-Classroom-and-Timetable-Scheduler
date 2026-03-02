'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '../Breadcrumb'

interface ContentAreaProps {
  sidebarOpen: boolean
  children: React.ReactNode
}

/**
 * ContentArea — the main scrollable content zone.
 *
 * Manages its own `mounted` flag so the sidebar-margin transition class is
 * SSR-safe: the server always renders `md:ml-[284px]` (expanded default) and
 * the client switches to the responsive class after hydration.
 *
 * CSS preserved from original AppShell:
 *   - margin transition: transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
 *   - expanded: md:ml-[284px]
 *   - collapsed: md:ml-[72px]
 *   - top offset: mt-[68px] md:mt-[76px]
 */
export default function ContentArea({ sidebarOpen, children }: ContentAreaProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const marginCls = mounted
    ? [
        'transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        sidebarOpen ? 'md:ml-[284px]' : 'md:ml-[72px]',
      ].join(' ')
    : 'md:ml-[284px]'

  return (
    <main className={[marginCls, 'mt-[68px] md:mt-[76px]'].join(' ')}>
      <div
        className={[
          'mr-2 md:mr-3 mb-2 md:mb-3',
          'min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-80px)]',
          'rounded-2xl',
          'bg-white dark:bg-[#1e1e1e]',
          'p-3 md:p-6',
          '[&>*]:rounded-2xl',
        ].join(' ')}
      >
        <Breadcrumb />
        {children}
      </div>
    </main>
  )
}
