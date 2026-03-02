'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SidebarState {
  /** Desktop sidebar expanded (true = 284px, false = 72px rail) */
  sidebarOpen: boolean
  /** Mobile drawer open */
  mobileOpen: boolean
  /** Rail is collapsed when desktop sidebar is closed AND mobile drawer is closed */
  isCollapsed: boolean
  /** Hamburger toggle — opens mobile drawer on <768 px, collapses rail on ≥768 px */
  toggle: () => void
  /** Close only the mobile drawer (e.g. after nav link click) */
  closeMobile: () => void
}

export function useSidebarState(): SidebarState {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
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

  const toggle = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((v) => !v)
    } else {
      setSidebarOpen((v) => !v)
    }
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return {
    sidebarOpen,
    mobileOpen,
    isCollapsed: !sidebarOpen && !mobileOpen,
    toggle,
    closeMobile,
  }
}
