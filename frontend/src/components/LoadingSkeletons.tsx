'use client'

import React from 'react'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

// Base Skeleton component
export function Skeleton({ className = '', style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={className}
      style={{
        background:
          'linear-gradient(90deg, var(--color-bg-surface-2) 25%, var(--color-bg-surface-3) 50%, var(--color-bg-surface-2) 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.6s infinite linear',
        borderRadius: 'var(--radius-sm)',
        ...style,
      }}
      {...props}
    />
  )
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-bg-surface)',
      }}
    >
      {/* Table Header */}
      <div
        style={{
          background: 'var(--color-bg-surface-2)',
          borderBottom: '1px solid var(--color-border)',
          padding: '10px 16px',
        }}
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} style={{ height: '14px', width: '60%' }} />
          ))}
        </div>
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} style={{ height: '14px' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * TableRowsSkeleton — renders shimmer <tr> rows INSIDE a <tbody>.
 * Columns align perfectly with the real table and there is no floating overlay.
 * Pass the same `columns` count as the real table. The last column always gets
 * two button-shaped placeholders to represent action buttons.
 */
export function TableRowsSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  const widths = ['72%', '88%', '63%', '79%', '68%', '84%', '59%', '91%', '76%', '66%']
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="table-cell">
              {colIndex === columns - 1 ? (
                <div className="flex gap-1.5">
                  <Skeleton style={{ height: '26px', width: '38px', borderRadius: '5px' }} />
                  <Skeleton style={{ height: '26px', width: '46px', borderRadius: '5px' }} />
                </div>
              ) : (
                <Skeleton
                  style={{
                    height: '13px',
                    width: widths[(rowIndex * columns + colIndex) % widths.length],
                  }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * MobileCardsSkeleton — shimmer placeholder cards for list/card views
 * (used on small screens in admin/students/faculty/admins pages).
 */
export function MobileCardsSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              <Skeleton style={{ height: '15px', width: '52%' }} />
              <Skeleton style={{ height: '12px', width: '72%' }} />
              <Skeleton style={{ height: '12px', width: '38%' }} />
            </div>
            <div className="flex gap-1 shrink-0">
              <Skeleton style={{ height: '28px', width: '38px', borderRadius: '6px' }} />
              <Skeleton style={{ height: '28px', width: '48px', borderRadius: '6px' }} />
            </div>
          </div>
          <div className="flex gap-1.5 mt-2.5">
            <Skeleton style={{ height: '20px', width: '58px', borderRadius: '20px' }} />
            <Skeleton style={{ height: '20px', width: '48px', borderRadius: '20px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Skeleton className="h-6 w-1/3 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  )
}

// List Skeleton (for mobile card views)
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
          }}
        >
          <div className="flex justify-between items-start" style={{ marginBottom: '12px' }}>
            <Skeleton style={{ height: '20px', width: '128px' }} />
            <Skeleton style={{ height: '24px', width: '80px', borderRadius: 'var(--radius-pill)' }} />
          </div>
          <Skeleton style={{ height: '16px', width: '100%', marginBottom: '8px' }} />
          <Skeleton style={{ height: '16px', width: '75%', marginBottom: '8px' }} />
          <Skeleton style={{ height: '16px', width: '66%' }} />
        </div>
      ))}
    </div>
  )
}

// Form Skeleton
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

// Dashboard Stats Skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

// Full Page Loading
export function PageLoader() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--color-bg-page)' }}
    >
      <GoogleSpinner size={48} />
    </div>
  )
}

// Spinner Component
export function Spinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeMap = { sm: 16, md: 32, lg: 48 }
  return <GoogleSpinner size={sizeMap[size]} className={className} />
}

// ── Timetable-specific skeletons ──────────────────────────────────────────────

/**
 * TimetableCardSkeleton – mimics a single timetable card in list/grid mode.
 * Renders instantly so the page always shows structure before data arrives.
 */
export function TimetableCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
      }}
      className="space-y-3"
    >
      <div className="flex justify-between items-start">
        <Skeleton style={{ height: '20px', width: '160px' }} />
        <Skeleton style={{ height: '20px', width: '80px', borderRadius: 'var(--radius-pill)' }} />
      </div>
      <Skeleton style={{ height: '14px', width: '112px' }} />
      <div className="flex gap-4 pt-1">
        <Skeleton style={{ height: '14px', width: '80px' }} />
        <Skeleton style={{ height: '14px', width: '64px' }} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton style={{ height: '32px', width: '80px', borderRadius: 'var(--radius-md)' }} />
        <Skeleton style={{ height: '32px', width: '96px', borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  )
}

/**
 * TimetableListSkeleton – renders N placeholder cards for the admin timetables
 * list page. Shown immediately on mount, replaced by real data once loaded.
 */
export function TimetableListSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      {/* Section header skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 dark:bg-gray-600" />
          <Skeleton className="h-5 w-24 dark:bg-gray-600" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <TimetableCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * VariantCardSkeleton – mimics a single variant comparison card on the review page.
 */
export function VariantCardSkeleton() {
  return (
    <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3 shadow-sm">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-28 dark:bg-gray-600" />
        <Skeleton className="h-10 w-10 rounded-full dark:bg-gray-600" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full dark:bg-gray-600" />
        <Skeleton className="h-3 w-4/5 dark:bg-gray-600" />
        <Skeleton className="h-3 w-3/5 dark:bg-gray-600" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg dark:bg-gray-600" />
    </div>
  )
}

/**
 * TimetableGridSkeleton – mimics the week-view table while entries are loading.
 * Shows 5 day columns × 8 time-slot rows of shimmering placeholders.
 */
export function TimetableGridSkeleton({ days = 5, slots = 8 }: { days?: number; slots?: number }) {
  return (
    <div
      className="overflow-x-auto"
      style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}
    >
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: 'var(--color-bg-surface-2)' }}>
            <th
              style={{
                padding: '12px',
                borderBottom: '1px solid var(--color-border)',
                borderRight: '1px solid var(--color-border)',
                width: '96px',
              }}
            >
              <Skeleton className="mx-auto" style={{ height: '14px', width: '40px' }} />
            </th>
            {Array.from({ length: days }).map((_, d) => (
              <th
                key={d}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--color-border)',
                  borderRight: '1px solid var(--color-border)',
                  minWidth: '128px',
                }}
              >
                <Skeleton className="mx-auto" style={{ height: '14px', width: '64px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: slots }).map((_, s) => (
            <tr
              key={s}
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <td style={{ padding: '12px', borderRight: '1px solid var(--color-border)' }}>
                <Skeleton style={{ height: '12px', width: '64px' }} />
              </td>
              {Array.from({ length: days }).map((_, d) => (
                <td
                  key={d}
                  style={{ padding: '8px', borderRight: '1px solid var(--color-border)' }}
                >
                  {(s + d) % 3 !== 2 ? null : (
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        padding: '8px',
                        background: 'var(--color-bg-surface-2)',
                      }}
                      className="space-y-1"
                    >
                      <Skeleton style={{ height: '12px', width: '100%' }} />
                      <Skeleton style={{ height: '10px', width: '75%' }} />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
