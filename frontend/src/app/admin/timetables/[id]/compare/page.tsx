'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'

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
    <div className="fixed inset-0 z-[300] bg-black/45 flex items-center justify-center">
      <div className="[background:var(--color-bg-surface)] rounded-2xl p-7 pb-5 max-w-[400px] w-[90%] shadow-2xl">
        <p className="text-[17px] font-bold mb-[10px] [color:var(--color-text-primary)]">
          Set {label} as the official timetable?
        </p>
        <p className="text-[13px] mb-[22px] [color:var(--color-text-secondary)]">
          This will send it for HOD approval. You can still make changes until approval is given.
        </p>
        <div className="flex gap-[10px] justify-end">
          <button className="btn-secondary rounded-full" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary rounded-full flex items-center gap-[6px]"
            onClick={onConfirm}
            disabled={submitting}
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
  const jobId = params.id as string

  // If the page was opened via ?a=&b= (from the review page), back should
  // always navigate back to the review page rather than dropping to the
  // empty VariantGrid overview intermediate step.
  const enteredWithParams = !!(searchParams.get('a') && searchParams.get('b'))

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
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <PageHeader
        title={inCompareMode
          ? `${labelFor(compareIds![0])} vs ${labelFor(compareIds![1])}`
          : 'Compare Variants'}
        parentLabel="Timetables"
        parentHref="/admin/timetables"
        secondaryActions={
          inCompareMode && !enteredWithParams ? (
            <button
              type="button"
              onClick={() => { setCompareIds(null); setDiffResult(null) }}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft size={15} />
              Back to variants
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="px-[14px] py-[10px] rounded-lg border text-[13px] [border-color:var(--color-danger)] [background:var(--color-danger-subtle)] [color:var(--color-danger-text)]">
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
        <div className="flex gap-5 items-start">
          {/* Department filter sidebar */}
          <DepartmentTree
            departments={depts}
            selectedDeptId={deptId}
            onSelect={(id) => setDeptId(id)}
            loading={diffLoading && depts.length === 0}
          />

          {/* Main diff grid */}
          <div className="flex-1 min-w-0">
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
