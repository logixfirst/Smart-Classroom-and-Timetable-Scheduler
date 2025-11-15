'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Appearance</h3>
        <p className="card-description">Choose how the interface looks to you</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Theme */}
          <button
            onClick={() => setTheme('light')}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
              theme === 'light'
                ? 'border-[#065fd4] bg-[#e8f0fe] dark:bg-[#065fd4]/20'
                : 'border-[#e5e5e5] dark:border-[#3d3d3d] hover:border-[#cccccc] dark:hover:border-[#606060]'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-8 bg-white border border-[#e5e5e5] rounded-md flex items-center justify-center">
                <div className="w-8 h-4 bg-[#f9f9f9] rounded-sm"></div>
              </div>
              <span className="text-sm font-medium text-[#0f0f0f] dark:text-white">Light</span>
              {theme === 'light' && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-[#065fd4] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </div>
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => setTheme('dark')}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
              theme === 'dark'
                ? 'border-[#065fd4] bg-[#e8f0fe] dark:bg-[#065fd4]/20'
                : 'border-[#e5e5e5] dark:border-[#3d3d3d] hover:border-[#cccccc] dark:hover:border-[#606060]'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-8 bg-[#0f0f0f] border border-[#3d3d3d] rounded-md flex items-center justify-center">
                <div className="w-8 h-4 bg-[#181818] rounded-sm"></div>
              </div>
              <span className="text-sm font-medium text-[#0f0f0f] dark:text-white">Dark</span>
              {theme === 'dark' && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-[#065fd4] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </div>
          </button>

          {/* System Theme */}
          <button
            onClick={() => setTheme('system')}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
              theme === 'system'
                ? 'border-[#065fd4] bg-[#e8f0fe] dark:bg-[#065fd4]/20'
                : 'border-[#e5e5e5] dark:border-[#3d3d3d] hover:border-[#cccccc] dark:hover:border-[#606060]'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-8 border border-[#e5e5e5] dark:border-[#3d3d3d] rounded-md overflow-hidden">
                <div className="h-full flex">
                  <div className="w-1/2 bg-white"></div>
                  <div className="w-1/2 bg-[#0f0f0f]"></div>
                </div>
              </div>
              <span className="text-sm font-medium text-[#0f0f0f] dark:text-white">System</span>
              {theme === 'system' && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-[#065fd4] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </div>
          </button>
        </div>

        <div className="text-xs text-[#606060] dark:text-[#aaaaaa] bg-[#f9f9f9] dark:bg-[#181818] p-3 rounded-lg border border-[#e5e5e5] dark:border-[#3d3d3d]">
          <strong>System:</strong> Automatically matches your device's theme preference
        </div>
      </div>
    </div>
  )
}
