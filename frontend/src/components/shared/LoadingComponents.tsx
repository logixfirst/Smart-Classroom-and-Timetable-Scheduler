/**
 * Table Loading Overlay Component
 * Reusable loading overlay for table containers
 */

interface TableLoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export const TableLoadingOverlay = ({ isLoading, message = "Loading..." }: TableLoadingOverlayProps) => {
  if (!isLoading) return null

  return (
    <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
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
  loadingText = "Loading..." 
}: PaginationButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  )
}