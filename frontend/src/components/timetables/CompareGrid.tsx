'use client'

/**
 * CompareGrid — side-by-side timetable diff view.
 *
 * Color legend:
 *   Blue   bg-[#e8f0fe]  — identical slot (shared in both A and B)
 *   Yellow bg-[#fef7e0]  — different from other variant (only_in_a / only_in_b)
 *   Red    bg-red-100    — conflict in THIS variant (has_conflict=true)
 *   Empty  bg-surface-1  — no class at this slot
 *
 * Mobile: tab switcher (A | B) instead of side-by-side.
 */

import { useState, useMemo, useRef } from 'react'
import { AlertCircle, ArrowLeftRight } from 'lucide-react'
import { SlotDetailPanel } from './SlotDetailPanel'
import type { ComparisonResult, TimetableSlotDetailed } from '@/types/timetable'

interface CompareGridProps {
  result: ComparisonResult | null
  labelA?: string
  labelB?: string
  loading?: boolean
  onPickA?: () => void
  onPickB?: () => void
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

type CellKind = 'shared' | 'diff' | 'conflict' | 'empty'

function cellStyle(kind: CellKind): React.CSSProperties {
  const map: Record<CellKind, React.CSSProperties> = {
    shared:   { background: '#e8f0fe', borderLeft: '3px solid #1a73e8' },
    diff:     { background: '#fef7e0', borderLeft: '3px solid #f9ab00' },
    conflict: { background: '#fce8e6', borderLeft: '3px solid #ea4335' },
    empty:    { background: 'var(--color-bg-surface-1, #f8f9fa)', borderLeft: '3px solid transparent' },
  }
  return map[kind]
}

// ---------------------------------------------------------------------------
// Build a lookup: key = "day|time_slot|subject_code|..." → slot
// ---------------------------------------------------------------------------

function slotKey(s: TimetableSlotDetailed) {
  return `${s.day}|${s.time_slot}|${s.subject_code}|${s.batch_name}`
}

interface GridRow {
  rowKey: string         // "day|time_slot"  — display row
  day: number
  time: string
  slotA: TimetableSlotDetailed | null
  slotB: TimetableSlotDetailed | null
  kindA: CellKind
  kindB: CellKind
}

function buildRows(result: ComparisonResult): GridRow[] {
  const sharedKeys = new Set(result.shared_slots.map(slotKey))
  const conflictsAKeys = new Set(result.conflicts_a.map(slotKey))
  const conflictsBKeys = new Set(result.conflicts_b.map(slotKey))

  // Collect all row keys
  const rowKeySet = new Set<string>()
  const allA = [...result.shared_slots, ...result.only_in_a]
  const allB = [...result.shared_slots, ...result.only_in_b]

  // keyed maps for fast lookup (take first match per row)
  const mapA = new Map<string, TimetableSlotDetailed>()
  const mapB = new Map<string, TimetableSlotDetailed>()

  for (const s of allA) {
    const rk = `${s.day}|${s.time_slot}`
    rowKeySet.add(rk)
    if (!mapA.has(rk)) mapA.set(rk, s)
  }
  for (const s of allB) {
    const rk = `${s.day}|${s.time_slot}`
    rowKeySet.add(rk)
    if (!mapB.has(rk)) mapB.set(rk, s)
  }

  const rows: GridRow[] = []
  for (const rk of rowKeySet) {
    const [dayStr, time] = rk.split('|')
    const day = parseInt(dayStr, 10)
    const slotA = mapA.get(rk) ?? null
    const slotB = mapB.get(rk) ?? null
    const sk = slotA ? slotKey(slotA) : ''
    const skB = slotB ? slotKey(slotB) : ''
    const kindA: CellKind =
      !slotA ? 'empty'
      : conflictsAKeys.has(sk) ? 'conflict'
      : sharedKeys.has(sk) ? 'shared'
      : 'diff'
    const kindB: CellKind =
      !slotB ? 'empty'
      : conflictsBKeys.has(skB) ? 'conflict'
      : sharedKeys.has(skB) ? 'shared'
      : 'diff'
    rows.push({ rowKey: rk, day, time, slotA, slotB, kindA, kindB })
  }

  // Sort by day then time
  rows.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return a.time.localeCompare(b.time)
  })
  return rows
}

// ---------------------------------------------------------------------------
// Single cell
// ---------------------------------------------------------------------------

function Cell({
  slot,
  kind,
  onClick,
}: {
  slot: TimetableSlotDetailed | null
  kind: CellKind
  onClick?: () => void
}) {
  return (
    <div
      onClick={slot ? onClick : undefined}
      style={{
        ...cellStyle(kind),
        flex: 1,
        minWidth: 0,
        padding: '7px 10px',
        borderRadius: 6,
        cursor: slot ? 'pointer' : 'default',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        transition: 'opacity 100ms',
        minHeight: 56,
      }}
    >
      {slot ? (
        <>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slot.subject_name || slot.subject_code}
          </span>
          <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slot.room_number} · {slot.faculty_name}
          </span>
          {kind === 'conflict' && (
            <span style={{ color: '#c5221f', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <AlertCircle size={10} /> Conflict
            </span>
          )}
        </>
      ) : (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>—</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="animate-pulse" style={{ height: 56, borderRadius: 6, background: 'var(--color-bg-surface-3)' }} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

function SummaryBar({ result }: { result: ComparisonResult }) {
  const { summary } = result
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      padding: '12px 16px',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      marginTop: 12,
    }}>
      {[
        { label: 'Identical slots', value: summary.identical, color: '#1a73e8' },
        { label: 'Different in A', value: summary.diff_a, color: '#f9ab00' },
        { label: 'Different in B', value: summary.diff_b, color: '#f9ab00' },
        { label: 'Conflicts in A', value: summary.conflicts_a, color: summary.conflicts_a > 0 ? '#ea4335' : '#34a853' },
        { label: 'Conflicts in B', value: summary.conflicts_b, color: summary.conflicts_b > 0 ? '#ea4335' : '#34a853' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CompareGrid({
  result,
  labelA = 'Variant A',
  labelB = 'Variant B',
  loading = false,
  onPickA,
  onPickB,
}: CompareGridProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A')
  const [detailSlot, setDetailSlot] = useState<TimetableSlotDetailed | null>(null)

  const rows = useMemo(
    () => (result ? buildRows(result) : []),
    [result],
  )

  // Group rows by day for display headers
  const rowsByDay = useMemo(() => {
    const map = new Map<number, GridRow[]>()
    rows.forEach((r) => {
      if (!map.has(r.day)) map.set(r.day, [])
      map.get(r.day)!.push(r)
    })
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [rows])

  if (loading) return <Skeleton />

  if (!result) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
      <ArrowLeftRight size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
      <p>Select two variants to compare</p>
    </div>
  )

  // ── Mobile tab switcher ──────────────────────────────────────────────
  const mobileView = (
    <div className="block md:hidden">
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
        {(['A', 'B'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #1a73e8' : '2px solid transparent',
              color: activeTab === tab ? '#1a73e8' : 'var(--color-text-secondary)',
              fontWeight: activeTab === tab ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {tab === 'A' ? labelA : labelB}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rowsByDay.map(([day, dayRows]) => (
          <div key={day}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', padding: '4px 0', letterSpacing: '0.06em' }}>
              {FULL_DAY_NAMES[day]}
            </p>
            {dayRows.map((r) => {
              const slot = activeTab === 'A' ? r.slotA : r.slotB
              const kind = activeTab === 'A' ? r.kindA : r.kindB
              return (
                <div key={r.rowKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 72, fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{r.time}</span>
                  <Cell slot={slot} kind={kind} onClick={() => setDetailSlot(slot)} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <SummaryBar result={result} />
    </div>
  )

  // ── Desktop side-by-side ─────────────────────────────────────────────
  const desktopView = (
    <div className="hidden md:block">
      {/* Column headers */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 72, flexShrink: 0 }} />
        {[
          { label: labelA, onPick: onPickA },
          { label: labelB, onPick: onPickB },
        ].map(({ label, onPick }) => (
          <div key={label} style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderRadius: 8,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {label}
            </span>
            {onPick && (
              <button
                className="btn-primary"
                style={{ fontSize: 11, height: 28, padding: '0 12px', borderRadius: 999 }}
                onClick={(e) => { e.stopPropagation(); onPick() }}
              >
                Pick {label}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rowsByDay.map(([day, dayRows]) => (
          <div key={day}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 3px 0' }}>
              <div style={{ width: 72, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {FULL_DAY_NAMES[day]}
              </span>
            </div>
            {dayRows.map((r) => (
              <div key={r.rowKey} style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 72, fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, paddingTop: 18 }}>
                  {r.time}
                </span>
                <Cell slot={r.slotA} kind={r.kindA} onClick={() => setDetailSlot(r.slotA)} />
                <Cell slot={r.slotB} kind={r.kindB} onClick={() => setDetailSlot(r.slotB)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <SummaryBar result={result} />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: '#e8f0fe', border: '#1a73e8', label: 'Identical in both' },
          { color: '#fef7e0', border: '#f9ab00', label: 'Different' },
          { color: '#fce8e6', border: '#ea4335', label: 'Has conflict' },
        ].map(({ color, border, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: color, borderLeft: `3px solid ${border}` }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      {desktopView}
      <SlotDetailPanel slot={detailSlot} onClose={() => setDetailSlot(null)} />
    </>
  )
}
