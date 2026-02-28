'use client'

/**
 * VariantCard — score card for one generated timetable variant.
 *
 * Visual hierarchy (Google decision-first UX):
 *   1. Score number (largest element — the decision anchor)
 *   2. Recommended badge (green pill, top-left)
 *   3. 4 ScoreBars (faculty / room / student / conflicts)
 *   4. Status badge + action buttons
 *
 * Interactions:
 *   - Hover → checkbox appears at top-left for multi-select
 *   - Selected → blue border ring-2 ring-[#1a73e8]
 *   - Approved → green top border
 */

import { useState } from 'react'
import { CheckCircle, AlertCircle, Eye, GitCompare } from 'lucide-react'
import { ScoreBar } from './ScoreBar'
import { VariantStatusBadge } from './VariantStatusBadge'
import type { VariantSummary } from '@/types/timetable'

interface VariantCardProps {
  variant: VariantSummary
  jobStatus?: string
  isSelected?: boolean
  onSelect?: (id: string, checked: boolean) => void
  onViewDetails?: (id: string) => void
  onCompare?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Score circle  (the big number)
// ---------------------------------------------------------------------------

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? 'var(--color-success, #34a853)'
    : score >= 55 ? 'var(--color-warning, #fbbc04)'
    : 'var(--color-danger, #ea4335)'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: 72,
      height: 72,
      borderRadius: '50%',
      border: `3px solid ${color}`,
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 24,
        fontWeight: 800,
        lineHeight: 1,
        color,
        fontFamily: "'Poppins', sans-serif",
      }}>
        {Math.round(score)}
      </span>
      <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 500 }}>
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
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-success, #34a853)', fontWeight: 600 }}>
      <CheckCircle size={13} /> No conflicts
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger, #ea4335)', fontWeight: 700 }}>
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
  isSelected = false,
  onSelect,
  onViewDetails,
  onCompare,
}: VariantCardProps) {
  const [hovered, setHovered] = useState(false)
  const qm = variant.quality_metrics

  const topBorderColor = jobStatus === 'approved' ? '#34a853' : 'transparent'
  const ringStyle = isSelected
    ? { outline: '2px solid #1a73e8', outlineOffset: '2px' }
    : {}

  return (
    <div
      role="article"
      aria-label={`Variant ${variant.variant_number}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderTop: `3px solid ${topBorderColor}`,
        borderRadius: 16,
        padding: '20px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'pointer',
        transition: 'box-shadow 150ms, transform 150ms',
        boxShadow: hovered || isSelected
          ? '0 4px 16px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        ...ringStyle,
      }}
      onClick={() => onSelect?.(variant.id, !isSelected)}
    >
      {/* Hover checkbox (multi-select) */}
      {(hovered || isSelected) && onSelect && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            onSelect(variant.id, !isSelected)
          }}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 18,
            height: 18,
            borderRadius: 4,
            border: `2px solid ${isSelected ? '#1a73e8' : 'var(--color-border)'}`,
            background: isSelected ? '#1a73e8' : 'var(--color-bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Recommended badge */}
      {qm.is_recommended && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            background: '#e6f4ea',
            color: '#137333',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 999,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            ★ Recommended
          </span>
        </div>
      )}

      {/* Header: label + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            Variant {variant.variant_number}
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {qm.optimization_label ?? 'Balanced'}
          </p>
        </div>
        <ScoreCircle score={qm.overall_score} />
      </div>

      {/* Score bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ScoreBar label="Faculty Load" value={qm.score_faculty_load ?? -1} />
        <ScoreBar label="Room Usage"   value={qm.score_room_utilization ?? qm.room_utilization_score ?? -1} />
        <ScoreBar label="Student Gaps" value={qm.score_student_gaps ?? -1} />
      </div>

      {/* Conflict + status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ConflictIndicator count={qm.total_conflicts ?? 0} />
        <VariantStatusBadge status={jobStatus} />
      </div>

      {/* Actions */}
      <div
        style={{ display: 'flex', gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-secondary"
          style={{ flex: 1, fontSize: 12, height: 32, borderRadius: 999 }}
          onClick={() => onViewDetails?.(variant.id)}
        >
          <Eye size={13} style={{ marginRight: 4, display: 'inline' }} />
          View
        </button>
        <button
          className="btn-primary"
          style={{ flex: 1, fontSize: 12, height: 32, borderRadius: 999 }}
          onClick={() => onCompare?.(variant.id)}
        >
          <GitCompare size={13} style={{ marginRight: 4, display: 'inline' }} />
          Compare
        </button>
      </div>
    </div>
  )
}
