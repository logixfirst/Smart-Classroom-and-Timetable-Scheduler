'use client'

import React from 'react'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

// Base Skeleton component
export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} {...props} />
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>

      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 py-3 border-b border-gray-100"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4" />
            ))}
          </div>
        ))}
      </div>
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
        <div key={i} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-2/3" />
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
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <GoogleSpinner size={48} className="mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 shadow-sm">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-40 dark:bg-gray-600" />
        <Skeleton className="h-5 w-20 rounded-full dark:bg-gray-600" />
      </div>
      <Skeleton className="h-3.5 w-28 dark:bg-gray-600" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-3.5 w-20 dark:bg-gray-600" />
        <Skeleton className="h-3.5 w-16 dark:bg-gray-600" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg dark:bg-gray-600" />
        <Skeleton className="h-8 w-24 rounded-lg dark:bg-gray-600" />
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-3 py-3 border-b border-r border-gray-200 dark:border-gray-700 w-24">
              <Skeleton className="h-3.5 w-10 mx-auto dark:bg-gray-600" />
            </th>
            {Array.from({ length: days }).map((_, d) => (
              <th key={d} className="px-3 py-3 border-b border-r border-gray-200 dark:border-gray-700 min-w-[8rem]">
                <Skeleton className="h-3.5 w-16 mx-auto dark:bg-gray-600" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from({ length: slots }).map((_, s) => (
            <tr key={s}>
              <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700">
                <Skeleton className="h-3 w-16 dark:bg-gray-600" />
              </td>
              {Array.from({ length: days }).map((_, d) => (
                <td key={d} className="px-2 py-2 border-r border-gray-100 dark:border-gray-700/50">
                  {/* ~40 % of cells get a class-card placeholder */}
                  {(s + d) % 3 !== 2 ? null : (
                    <div className="rounded-lg p-2 space-y-1 bg-gray-100 dark:bg-gray-700/50">
                      <Skeleton className="h-3 w-full dark:bg-gray-600" />
                      <Skeleton className="h-2.5 w-3/4 dark:bg-gray-600" />
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
