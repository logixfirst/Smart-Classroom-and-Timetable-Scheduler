'use client'

/**
 * VariantCard — score card for one generated timetable variant.
 *
 * Visual hierarchy (Google decision-first UX):
 *   1. Score number (largest element — the decision anchor)
 *   2. Recommended badge (green pill, top-right)
 *   3. 4 ScoreBars (faculty / room / student / conflicts)
 *   4. Status badge + action buttons
 *
 * Interactions:
 *   - Hover → checkbox appears at top-left for multi-select
 *   - Selected → blue outline ring
 *   - Approved → green top border
 */

import { useRef, useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { ScoreBar } from './ScoreBar'
import { VariantStatusBadge } from './VariantStatusBadge'
import type { VariantSummary } from '@/types/timetable'

interface VariantCardProps {
  variant: VariantSummary
  jobStatus?: string
  isActive?: boolean
  isApproved?: boolean
  isCompareSelected?: boolean
  onSelect?: (id: string, checked: boolean) => void
  onViewDetails?: (id: string) => void
  onPickVariant?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Score circle  (the big number)
// ---------------------------------------------------------------------------

function ScoreCircle({ score }: { score: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const color =
    score >= 80 ? 'var(--color-success, #34a853)'
    : score >= 55 ? 'var(--color-warning, #fbbc04)'
    : 'var(--color-danger, #ea4335)'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--sc-color', color)
  }, [color])

  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center shrink-0 w-[72px] h-[72px] rounded-full border-[3px] [border-color:var(--sc-color)]"
    >
      <span className="text-2xl font-extrabold leading-none [color:var(--sc-color)] [font-family:'Poppins',sans-serif]">
        {Math.round(score)}
      </span>
      <span className="text-[9px] font-medium [color:var(--color-text-muted)]">
        /100
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conflict indicator
// ---------------------------------------------------------------------------

function ConflictIndicator({ count }: { count: number }) {
  if (count === 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold [color:var(--color-success,#34a853)]">
      <CheckCircle size={13} /> No conflicts
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-bold [color:var(--color-danger,#ea4335)]">
      <AlertCircle size={13} /> {count} {count === 1 ? 'conflict' : 'conflicts'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export function VariantCard({
  variant,
  jobStatus = 'completed',
  isActive = false,
  isApproved = false,
  isCompareSelected = false,
  onSelect,
  onViewDetails,
  onPickVariant,
}: VariantCardProps) {
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const qm = variant.quality_metrics

  // Dynamic CSS variables — avoids inline style props entirely
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--card-top', jobStatus === 'approved' ? '#34a853' : 'transparent')
  }, [jobStatus])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const elevated = hovered || isActive || isCompareSelected
    el.style.setProperty('--card-shadow',
      elevated ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)')
    el.style.setProperty('--card-translate', hovered ? 'translateY(-1px)' : 'none')
    el.style.setProperty('--card-outline', isActive ? '2px solid #1a73e8' : 'none')
  }, [hovered, isActive, isCompareSelected])

  return (
    <div
      ref={cardRef}
      role="article"
      aria-label={`Variant ${variant.variant_number}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        'relative flex flex-col cursor-pointer gap-3.5',
        'rounded-2xl px-[18px] pt-5 pb-4',
        'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
        '[border-top:3px_solid_var(--card-top)]',
        'shadow-[var(--card-shadow)] [transform:var(--card-translate)]',
        '[outline:var(--card-outline)]',
        'transition-[box-shadow,transform] duration-150',
      ].join(' ')}
      onClick={() => onViewDetails?.(variant.id)}
    >
      {/* Multi-select checkbox: always visible to avoid accidental hover-triggered selection */}
      {onSelect && (
        <button
          type="button"
          aria-label={isCompareSelected ? 'Deselect variant' : 'Select variant'}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(variant.id, !isCompareSelected)
          }}
          className={[
            'absolute top-2.5 left-2.5 w-[18px] h-[18px] rounded-[4px] cursor-pointer',
            'flex items-center justify-center border-2 transition-colors',
            isCompareSelected
              ? 'bg-[#1a73e8] border-[#1a73e8]'
              : 'border-[var(--color-border)] bg-[var(--color-bg-surface)]',
          ].join(' ')}
        >
          {isCompareSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Recommended badge */}
      {qm.is_recommended && (
        <div className="absolute top-2.5 right-2.5">
          <span className="bg-[#e6f4ea] text-[#137333] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
            ★ Recommended
          </span>
        </div>
      )}

      {/* Header: label + score circle */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold mb-0.5 [color:var(--color-text-primary)]">
            Variant {variant.variant_number}
          </p>
          <p className="text-[11px] font-medium [color:var(--color-text-muted)]">
            {qm.optimization_label ?? 'Balanced'}
          </p>
        </div>
        <ScoreCircle score={qm.overall_score} />
      </div>

      {/* Score bars */}
      <div className="flex flex-col gap-2">
        <ScoreBar label="Faculty Load" value={qm.score_faculty_load ?? -1} />
        <ScoreBar label="Room Usage"   value={qm.score_room_utilization ?? -1} />
        <ScoreBar label="Student Gaps" value={qm.score_student_gaps ?? -1} />
      </div>

      {/* Conflict + status row */}
      <div className="flex items-center justify-between">
        <ConflictIndicator count={qm.total_conflicts ?? 0} />
        <VariantStatusBadge status={jobStatus} />
      </div>

      {/* Actions */}
      <div
        className="flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn-secondary flex-1 text-xs h-8 rounded-full"
          onClick={() => onViewDetails?.(variant.id)}
        >
          <Eye size={13} className="mr-1 inline" />
          View
        </button>
        {isApproved ? (
          <div className="flex-1 flex items-center justify-center text-xs h-8 rounded-full bg-[var(--color-success-subtle)] text-[var(--color-success-text)] font-semibold">
            <CheckCircle size={13} className="mr-1" />
            Approved
          </div>
        ) : jobStatus === 'approved' ? (
          <div className="flex-1 flex items-center justify-center text-xs h-8 rounded-full bg-[var(--color-bg-surface-2)] text-[var(--color-text-muted)] font-medium">
            View Only
          </div>
        ) : (
          <button
            type="button"
            className="btn-success flex-1 text-xs h-8 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPickVariant?.(variant.id)}
            disabled={!onPickVariant}
          >
            <CheckCircle size={13} className="mr-1 inline" />
            Approve
          </button>
        )}
      </div>
    </div>
  )
}
