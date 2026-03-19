'use client'

/**
 * VariantGrid — 3-column responsive grid of VariantCards.
 *
 * Manages multi-select state and shows a floating "Compare Selected →" pill
 * when exactly 2 variants are chosen.
 *
 * Layout: 3col desktop → 2col tablet → 1col mobile
 * Animation: cards stagger-fade in (50ms delay each)
 */

import { useState, useCallback } from 'react'
import { CalendarDays, GitCompare } from 'lucide-react'
import { VariantCard } from './VariantCard'
import type { VariantSummary } from '@/types/timetable'

interface VariantGridProps {
  variants: VariantSummary[]
  jobStatus?: string
  loading?: boolean
  activeVariantId?: string | null
  onViewDetails: (variantId: string) => void
  onCompare: (variantIds: [string, string]) => void
  onPickVariant?: (variantId: string) => void
}

// ---------------------------------------------------------------------------
// Skeleton card (exported so review/loading.tsx can use it directly)
// ---------------------------------------------------------------------------

export function VariantCardSkeleton() {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl px-[18px] pt-5 pb-4 flex flex-col gap-3.5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="animate-pulse w-20 h-3.5 rounded bg-[var(--color-bg-surface-3)]" />
          <div className="animate-pulse w-[120px] h-3 rounded bg-[var(--color-bg-surface-3)] mt-1.5" />
        </div>
        <div className="animate-pulse w-[72px] h-[72px] rounded-full bg-[var(--color-bg-surface-3)]" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="animate-pulse w-full h-2.5 rounded bg-[var(--color-bg-surface-3)]" />
          <div className="animate-pulse w-full h-1.5 rounded-full bg-[var(--color-bg-surface-3)]" />
        </div>
      ))}
      <div className="animate-pulse w-full h-8 rounded-full bg-[var(--color-bg-surface-3)]" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center px-6 py-16 gap-3">
      <CalendarDays size={64} color="var(--color-text-muted)" />
      <p className="text-base font-semibold text-[var(--color-text-primary)]">
        No timetables generated yet
      </p>
      <p className="text-[13px] text-[var(--color-text-muted)] text-center max-w-[320px]">
        Generate a timetable to see variants here. Each variant represents a different
        optimisation strategy.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main grid
// ---------------------------------------------------------------------------

export function VariantGrid({
  variants,
  jobStatus = 'completed',
  loading = false,
  activeVariantId = null,
  onViewDetails,
  onCompare,
  onPickVariant,
}: VariantGridProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        if (next.size < 2) next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleCompareSelected = useCallback(() => {
    const ids = [...selected] as [string, string]
    onCompare(ids)
  }, [selected, onCompare])

  return (
    <div className="relative">
      {selected.size > 0 && (
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">
          {selected.size === 1
            ? 'Select one more variant to compare'
            : '2 variants selected — ready to compare'}
        </p>
      )}

      {/* Responsive grid */}
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {loading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-fade-in"
              >
                <VariantCardSkeleton />
              </div>
            ))
          : variants.length === 0
            ? <EmptyState />
            : variants.map((variant) => (
                <div
                  key={variant.id}
                  className="animate-fade-in"
                >
                  <VariantCard
                    variant={variant}
                    jobStatus={jobStatus}
                    isActive={activeVariantId === variant.id}
                    isCompareSelected={selected.has(variant.id)}
                    onSelect={handleSelect}
                    onViewDetails={onViewDetails}
                    onPickVariant={onPickVariant}
                  />
                </div>
              ))}
      </div>

      {/* Floating compare pill — appears after first select/compare click */}
      {selected.size >= 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <button
            className="btn-primary h-11 px-7 rounded-full text-sm font-semibold flex items-center gap-2 shadow-[0_4px_20px_rgba(26,115,232,0.4)]"
            disabled={selected.size !== 2}
            onClick={handleCompareSelected}
          >
            <GitCompare size={16} />
            {selected.size === 2 ? 'Compare Selected →' : 'Select one more variant'}
          </button>
        </div>
      )}
    </div>
  )
}
