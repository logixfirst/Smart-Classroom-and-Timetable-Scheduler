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
import { CalendarDays, GitCompare, Loader2 } from 'lucide-react'
import { VariantCard } from './VariantCard'
import type { VariantSummary } from '@/types/timetable'

interface VariantGridProps {
  variants: VariantSummary[]
  jobStatus?: string
  loading?: boolean
  onViewDetails: (variantId: string) => void
  onCompare: (variantIds: [string, string]) => void
  onPickVariant?: (variantId: string) => void
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function VariantCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: '20px 18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="animate-pulse" style={{ width: 80, height: 14, borderRadius: 4, background: 'var(--color-bg-surface-3)' }} />
          <div className="animate-pulse" style={{ width: 120, height: 12, borderRadius: 4, background: 'var(--color-bg-surface-3)', marginTop: 6 }} />
        </div>
        <div className="animate-pulse" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-bg-surface-3)' }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="animate-pulse" style={{ width: '100%', height: 10, borderRadius: 4, background: 'var(--color-bg-surface-3)' }} />
          <div className="animate-pulse" style={{ width: '100%', height: 5, borderRadius: 999, background: 'var(--color-bg-surface-3)' }} />
        </div>
      ))}
      <div className="animate-pulse" style={{ width: '100%', height: 32, borderRadius: 999, background: 'var(--color-bg-surface-3)' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: 12,
    }}>
      <CalendarDays size={64} color="var(--color-text-muted)" />
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        No timetables generated yet
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 320 }}>
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

  const handleCompareOne = useCallback(
    (id: string) => {
      if (selected.size === 1 && !selected.has(id)) {
        const other = [...selected][0]
        onCompare([other, id] as [string, string])
      } else {
        // Select the card so user can pick a second
        setSelected(new Set([id]))
      }
    },
    [selected, onCompare],
  )

  return (
    <div style={{ position: 'relative' }}>
      {selected.size > 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          {selected.size === 1
            ? 'Select one more variant to compare'
            : '2 variants selected — ready to compare'}
        </p>
      )}

      {/* Responsive grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {loading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-in"
              >
                <VariantCardSkeleton />
              </div>
            ))
          : variants.length === 0
            ? <EmptyState />
            : variants.map((variant, idx) => (
                <div
                  key={variant.id}
                  style={{
                    animation: `fadeInUp 300ms ease ${idx * 50}ms both`,
                  }}
                >
                  <VariantCard
                    variant={variant}
                    jobStatus={jobStatus}
                    isSelected={selected.has(variant.id)}
                    onSelect={handleSelect}
                    onViewDetails={onViewDetails}
                    onCompare={handleCompareOne}
                  />
                </div>
              ))}
      </div>

      {/* Floating compare pill — appears when 2 selected */}
      {selected.size === 2 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          animation: 'fadeInUp 200ms ease',
        }}>
          <button
            className="btn-primary"
            style={{
              height: 44,
              padding: '0 28px',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 20px rgba(26,115,232,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={handleCompareSelected}
          >
            <GitCompare size={16} />
            Compare Selected →
          </button>
        </div>
      )}
    </div>
  )
}
