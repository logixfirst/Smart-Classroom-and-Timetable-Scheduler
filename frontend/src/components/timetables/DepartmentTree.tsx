'use client'

/**
 * DepartmentTree — collapsible department selector for the variant detail view.
 *
 * Desktop: 240px left sidebar
 * Mobile: renders as a compact dropdown instead (bottom sheet omitted for brevity).
 *
 * All filtering is pure state — no page reload.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, Building2 } from 'lucide-react'
import type { DepartmentOption } from '@/types/timetable'

interface DepartmentTreeProps {
  departments: DepartmentOption[]
  selectedDeptId: string              // "all" or UUID
  onSelect: (deptId: string) => void
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Single dept row
// ---------------------------------------------------------------------------

function DeptRow({
  dept,
  isActive,
  onClick,
}: {
  dept: DepartmentOption
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={dept.name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        background: isActive ? '#c2e7ff' : 'transparent',
        color: isActive ? '#1a1a1a' : 'var(--color-text-secondary)',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        textAlign: 'left',
        transition: 'background 100ms',
      }}
    >
      <Building2
        size={14}
        style={{ flexShrink: 0, color: isActive ? '#1a73e8' : 'var(--color-text-muted)' }}
      />
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
      }}>
        {dept.name}
      </span>
      {dept.total_entries !== undefined && (
        <span style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-surface-3)',
          padding: '1px 5px',
          borderRadius: 4,
          flexShrink: 0,
        }}>
          {dept.total_entries}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TreeSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: 32,
            borderRadius: 8,
            background: 'var(--color-bg-surface-3)',
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function NoDepts() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0',
      gap: 8,
    }}>
      <BookOpen size={28} color="var(--color-text-muted)" />
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
        No departments found
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile dropdown (used when screen is too narrow for sidebar)
// ---------------------------------------------------------------------------

function MobileDropdown({
  departments,
  selectedDeptId,
  onSelect,
}: Omit<DepartmentTreeProps, 'loading'>) {
  const current =
    selectedDeptId === 'all'
      ? 'All Departments'
      : departments.find((d) => d.id === selectedDeptId)?.name ?? 'All Departments'

  return (
    <select
      value={selectedDeptId}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-surface)',
        color: 'var(--color-text-primary)',
        fontSize: 13,
        appearance: 'none',
      }}
    >
      <option value="all">All Departments</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DepartmentTree({
  departments,
  selectedDeptId,
  onSelect,
  loading = false,
}: DepartmentTreeProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <>
      {/* Desktop sidebar tree */}
      <div
        className="hidden md:flex"
        style={{
          flexDirection: 'column',
          gap: 2,
          width: 240,
          flexShrink: 0,
        }}
      >
        {/* "All Departments" entry */}
        <button
          onClick={() => onSelect('all')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: selectedDeptId === 'all' ? '#c2e7ff' : 'transparent',
            color: selectedDeptId === 'all' ? '#1a1a1a' : 'var(--color-text-secondary)',
            fontSize: 13,
            fontWeight: selectedDeptId === 'all' ? 700 : 500,
            textAlign: 'left',
            transition: 'background 100ms',
            width: '100%',
          }}
          onClick={() => { onSelect('all'); setExpanded(true) }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} style={{ flexShrink: 0 }} />
            All Departments
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            style={{ cursor: 'pointer', display: 'flex' }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {expanded && (
          <div style={{ paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {loading
              ? <TreeSkeleton />
              : departments.length === 0
                ? <NoDepts />
                : departments.map((dept) => (
                    <DeptRow
                      key={dept.id}
                      dept={dept}
                      isActive={selectedDeptId === dept.id}
                      onClick={() => onSelect(dept.id)}
                    />
                  ))}
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      <div className="flex md:hidden" style={{ width: '100%' }}>
        <MobileDropdown
          departments={departments}
          selectedDeptId={selectedDeptId}
          onSelect={onSelect}
        />
      </div>
    </>
  )
}
