'use client'

import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'

interface SearchBarProps {
  /** Whether the mobile search overlay is open */
  open: boolean
  onClose: () => void
}

/**
 * SearchBar — renders the desktop search input (Zone 2) and the mobile
 * full-screen search overlay.  The mobile trigger button lives in Header's
 * Zone 3 and calls the `onOpen` callback provided by the parent.
 */
export default function SearchBar({ open, onClose }: SearchBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  // Auto-focus when mobile overlay opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60)
  }, [open])

  return (
    <>
      {/* ── Desktop search bar (Zone 2, hidden on mobile) ────────────────── */}
      <div className="hidden md:flex flex-1 items-center pl-3">
        <div className="flex items-center overflow-hidden transition-shadow duration-150 w-[720px] h-12 bg-[#e9eef6] rounded-full focus-within:shadow-[0_2px_8px_rgba(32,33,36,0.2)] focus-within:bg-white">
          <span className="ml-4 mr-2 shrink-0 flex items-center justify-center text-[#444746]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search timetables, faculty, rooms…"
            className="flex-1 h-full bg-transparent outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#80868b]"
          />
        </div>
      </div>

      {/* ── Mobile full-screen search overlay ────────────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-[#202124] flex flex-col">
          <div className="flex items-center h-14 px-2 gap-1 border-b border-[#e0e0e0] dark:border-[#3c4043]">
            <button
              aria-label="Close search"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#444746] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition-colors shrink-0"
            >
              <X size={20} />
            </button>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search timetables, faculty, rooms…"
              className="flex-1 h-10 px-2 text-sm bg-transparent outline-none text-[#202124] dark:text-[#e8eaed] placeholder:text-[#9aa0a6]"
            />
          </div>
        </div>
      )}
    </>
  )
}
