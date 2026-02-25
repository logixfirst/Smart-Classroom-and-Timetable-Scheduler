/**
 * Table Loading Overlay Component
 * Reusable loading overlay for table containers
 */

import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

interface TableLoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export const TableLoadingOverlay = ({
  isLoading,
  message = 'Loading...',
}: TableLoadingOverlayProps) => {
  if (!isLoading) return null

  return (
    <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
      <div className="flex flex-col items-center">
        <GoogleSpinner size={32} className="mb-2" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
      </div>
    </div>
  )
}

/**
 * Pagination Button with Loading State
 * Reusable pagination button component
 */

interface PaginationButtonProps {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
}

export const PaginationButton = ({
  onClick,
  disabled,
  isLoading,
  children,
  loadingText = 'Loading...',
}: PaginationButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="flex items-center">
          <GoogleSpinner size={16} className="mr-2" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  )
}
