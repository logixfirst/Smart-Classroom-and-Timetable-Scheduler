'use client'

import { useState } from 'react'

interface ProfileDropdownProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export default function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.role}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{user.name}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
          </div>
          <div className="py-2">
            <button className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
              Profile Settings
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
              Preferences
            </button>
            <hr className="my-2 border-neutral-200 dark:border-neutral-700" />
            <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
