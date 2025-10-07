'use client'

import { useRef, useEffect, useState } from 'react'

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
  setShowSignOutDialog
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-md px-2 sm:px-2 lg:px-3 py-2 sm:py-2 md:py-3 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
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
          >
            <span className="text-sm sm:text-base">☰</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2196F3] to-[#1976D2] flex items-center justify-center text-white font-bold text-sm transition-colors duration-200">
              <span>S</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-[#0f0f0f] dark:text-white">SIH28</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button className="header-circle-notification">
            <span className="text-sm sm:text-base">🔔</span>
            <span className="notification-badge">3</span>
          </button>
          
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="header-circle-btn"
            >
              <span className="text-sm sm:text-base">⚙️</span>
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#3d3d3d] rounded-xl shadow-lg z-[9999]">
                <div className="py-1">
                  <button className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-[#0f0f0f] dark:text-white hover:bg-[#f1f1f1] dark:hover:bg-[#272727] transition-colors duration-200 flex items-center gap-2 rounded-lg">
                    <span className="text-sm">👤</span> My Profile
                  </button>
                  <button className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-[#0f0f0f] dark:text-white hover:bg-[#f1f1f1] dark:hover:bg-[#272727] transition-colors duration-200 flex items-center gap-2 rounded-lg">
                    <span className="text-sm">⚙️</span> Settings
                  </button>
                  <button 
                    onClick={() => { setShowSignOutDialog(true); setShowSettings(false); }}
                    className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-[#ff4444] hover:bg-[#fce8e6] dark:hover:bg-[#ff4444]/10 transition-colors duration-200 flex items-center gap-2 rounded-lg"
                  >
                    <span className="text-sm">🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}