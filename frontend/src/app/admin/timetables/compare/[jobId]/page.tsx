'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle } from 'lucide-react'

import { VariantGrid }   from '@/components/timetables/VariantGrid'
import { CompareGrid }   from '@/components/timetables/CompareGrid'
import { DepartmentTree } from '@/components/timetables/DepartmentTree'
import {
  fetchVariants,
  compareVariants,
  pickVariant,
} from '@/lib/api/timetable-variants'
import type { VariantSummary, ComparisonResult, DepartmentOption } from '@/types/timetable'

// ── Confirmation dialog ───────────────────────────────────────────────────────

function PickDialog({
  label,
  onConfirm,
  onCancel,
  submitting,
}: {
  label: string
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-bg-surface)',
        borderRadius: 16,
        padding: '28px 28px 20px',
        maxWidth: 400,
        width: '90%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>
          Set {label} as the official timetable?
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 22 }}>
          This will send it for HOD approval. You can still make changes until approval is given.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ borderRadius: 999 }}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={submitting}
            style={{ borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {submitting ? 'Sending…' : (
              <><CheckCircle size={14} /> Confirm & Send for Approval</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompareVariantsPage() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const jobId = params.jobId as string

  const [variants,    setVariants]    = useState<VariantSummary[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // compare state
  const [compareIds,  setCompareIds]  = useState<[string, string] | null>(null)
  const [deptId,      setDeptId]      = useState('all')
  const [depts,       setDepts]       = useState<DepartmentOption[]>([])
  const [diffResult,  setDiffResult]  = useState<ComparisonResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  // pick/approval state
  const [pickingId,   setPickingId]   = useState<string | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  // ── Load variants ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) return
    setLoading(true)
    fetchVariants(jobId)
      .then((data) => {
        setVariants(data)
        // Pre-select pair from URL query params
        const a = searchParams.get('a')
        const b = searchParams.get('b')
        if (a && b) setCompareIds([a, b])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [jobId, searchParams])

  // ── Build department list from all variants combined ──────────────────────
  useEffect(() => {
    if (!variants.length) return
    // Collect unique department_ids from all entries in all variants (no extra API round-trip)
    // For now: departments come from the compare diff result after loading
    // Fallback: provide a generic "All Departments" until a diff is run.
  }, [variants])

  // ── Run diff when compareIds or deptId change ──────────────────────────────
  const runDiff = useCallback(async (
    ids: [string, string],
    dept: string,
  ) => {
    setDiffLoading(true)
    setDiffResult(null)
    try {
      const res = await compareVariants(jobId, ids[0], ids[1], dept)
      setDiffResult(res)
      // Extract departments from diff result for filter panel
      const deptSet = new Set<string>()
      ;[...res.shared_slots, ...res.only_in_a, ...res.only_in_b].forEach(
        (s) => { if (s.department_id) deptSet.add(s.department_id) }
      )
      setDepts([...deptSet].map((d) => ({ id: d, name: d, code: d })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDiffLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (compareIds) runDiff(compareIds, deptId)
  }, [compareIds, deptId, runDiff])

  // ── Pick variant handler ───────────────────────────────────────────────────
  const handleConfirmPick = async () => {
    if (!pickingId) return
    setSubmitting(true)
    try {
      await pickVariant(pickingId, jobId)
      router.push(`/admin/timetables/${jobId}/review`)
    } catch (e: any) {
      setError(e.message)
      setPickingId(null)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Label helpers ──────────────────────────────────────────────────────────
  const labelFor = (id: string | null) => {
    if (!id) return ''
    const v = variants.find((v) => v.id === id)
    return v ? `Variant ${v.variant_number}` : id
  }

  const inCompareMode = !!compareIds

  return (
    <div style={{ padding: '24px 24px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => {
            if (inCompareMode) {
              setCompareIds(null)
              setDiffResult(null)
            } else {
              router.back()
            }
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {inCompareMode
              ? `${labelFor(compareIds![0])} vs ${labelFor(compareIds![1])}`
              : 'Timetable Variants'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {inCompareMode
              ? 'Differences highlighted in yellow · Conflicts in red · Identical in blue'
              : 'Select 2 variants to compare side-by-side'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-danger-subtle)',
          border: '1px solid var(--color-danger)',
          borderRadius: 8,
          color: 'var(--color-danger-text)',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Variants overview (shown when not in compare mode) */}
      {!inCompareMode && (
        <VariantGrid
          variants={variants}
          jobStatus="completed"
          loading={loading}
          onViewDetails={(id) => router.push(`/admin/timetables/${jobId}?variant=${id}`)}
          onCompare={(ids) => setCompareIds(ids)}
        />
      )}

      {/* Compare mode */}
      {inCompareMode && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Department filter sidebar */}
          <DepartmentTree
            departments={depts}
            selectedDeptId={deptId}
            onSelect={(id) => setDeptId(id)}
            loading={diffLoading && depts.length === 0}
          />

          {/* Main diff grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <CompareGrid
              result={diffResult}
              labelA={labelFor(compareIds![0])}
              labelB={labelFor(compareIds![1])}
              loading={diffLoading}
              onPickA={() => setPickingId(compareIds![0])}
              onPickB={() => setPickingId(compareIds![1])}
            />
          </div>
        </div>
      )}

      {/* Pick confirmation dialog */}
      {pickingId && (
        <PickDialog
          label={labelFor(pickingId)}
          onConfirm={handleConfirmPick}
          onCancel={() => setPickingId(null)}
          submitting={submitting}
        />
      )}
    </div>
  )
}
