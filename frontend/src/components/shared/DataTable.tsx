'use client'

import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/LoadingSkeletons'

type HideBelow = 'sm' | 'md' | 'lg' | 'xl'

const hiddenClassMap: Record<HideBelow, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
  hideBelow?: HideBelow
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  searchable?: boolean
  pagination?: boolean
  pageSize?: number
  loading?: boolean
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 14" fill="none" style={{ color: 'var(--color-border-strong)' }}>
        <path d="M5 1L2 5h6L5 1zM5 13l3-4H2l3 4z" fill="currentColor"/>
      </svg>
    )
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-primary)' }}>
      {direction === 'asc'
        ? <path d="M5 1L1 7h8L5 1z" fill="currentColor"/>
        : <path d="M5 9L9 3H1l4 6z" fill="currentColor"/>
      }
    </svg>
  )
}

export default function DataTable({
  data,
  columns,
  searchable = true,
  pagination = true,
  pageSize = 10,
  loading = false,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-bg-surface)',
      }}
    >
      {searchable && (
        <div
          style={{
            background: 'var(--color-bg-surface)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="header-search"
              style={{ width: '260px', paddingLeft: '36px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="table" style={{ minWidth: '640px' }}>
          <thead className="table-header">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`table-header-cell ${column.hideBelow ? hiddenClassMap[column.hideBelow] : ''} ${
                    column.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {column.label}
                    {column.sortable && (
                      <SortIcon
                        active={sortColumn === column.key}
                        direction={sortDirection}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <TableSkeleton rows={5} columns={columns.length} />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={searchTerm ? 'No matching results' : 'No data available'}
                    description={searchTerm ? `No records found for "${searchTerm}"` : undefined}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={index} className="table-row">
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={`table-cell ${column.hideBelow ? hiddenClassMap[column.hideBelow] : ''}`}
                    >
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}
        >
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn-ghost"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Previous page"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="9 2 5 7 9 12"/></svg>
            </button>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn-ghost"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Next page"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="5 2 9 7 5 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
