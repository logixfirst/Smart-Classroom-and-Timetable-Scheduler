'use client'

import { useEffect } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPage?: boolean
  className?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  className = '',
}: PaginationProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys if not focused on an input element
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return
      }

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault()
        onPageChange(currentPage - 1)
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault()
        onPageChange(currentPage + 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        onPageChange(1)
      } else if (e.key === 'End') {
        e.preventDefault()
        onPageChange(totalPages)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, onPageChange])

  // Calculate the range of items being displayed
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 7

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
      style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}
    >
      {/* Results info */}
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        {totalCount === 0 ? (
          <span>No results found</span>
        ) : (
          <span>
            Showing{' '}
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{startItem}</span>
            {'–'}
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{endItem}</span>
            {' of '}
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{totalCount}</span>
            {' results'}
          </span>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center" style={{ gap: '2px' }}>
        {/* Items per page selector */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2 mr-4">
            <label
              htmlFor="items-per-page"
              style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
            >
              Per page:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange(Number(e.target.value))}
              className="input-primary"
              style={{ width: '64px', height: '32px', fontSize: '13px' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}

        {/* First button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
          title="First page (Home)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="2" y1="2" x2="2" y2="10"/>
            <polyline points="5 2 10 6 5 10"/>
            <polyline points="5 2 10 6 5 10" transform="scale(-1,1) translate(-12,0)"/>
          </svg>
        </button>

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
          title="Previous page (←)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="9 2 5 7 9 12"/></svg>
        </button>

        {/* Page numbers — hidden on mobile */}
        <div className="hidden sm:flex items-center" style={{ gap: '2px' }}>
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  style={{ padding: '0 8px', fontSize: '13px', color: 'var(--color-text-muted)' }}
                >
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isActive ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                  color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                }}
                title={`Page ${pageNum}`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Mobile: current page indicator */}
        <div
          className="sm:hidden"
          style={{ padding: '0 12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}
        >
          {currentPage} / {totalPages}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
          title="Next page (→)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="5 2 9 7 5 12"/></svg>
        </button>

        {/* Last button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
          title="Last page (End)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="10" y1="2" x2="10" y2="10"/>
            <polyline points="7 2 2 6 7 10"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
