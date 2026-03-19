/**
 * Timetable Variant Review & Approval Page
 * Multi-variant comparison with rich timetable visualization
 * Matches backend: TimetableWorkflow, TimetableVariant models
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { authenticatedFetch } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { TimetableGridSkeleton, VariantCardSkeleton, Skeleton } from '@/components/LoadingSkeletons'
import PageHeader from '@/components/shared/PageHeader'
import { CheckCircle, XCircle, Printer } from 'lucide-react'
import { VariantGrid } from '@/components/timetables/VariantGrid'
import { SlotDetailPanel } from '@/components/timetables/SlotDetailPanel'
import { TimetableGridFiltered } from '@/components/timetables/TimetableGridFiltered'
import { fetchDepartmentNames } from '@/lib/api/timetable-variants'
import type { VariantSummary, VariantScoreCard, TimetableSlotDetailed, DepartmentOption, BackendTimetableEntry } from '@/types/timetable'

// Backend types matching Django models
interface TimetableEntry {
  day: number // 0-4 (Monday-Friday)
  course_id?: string
  offering_id?: string
  time_slot: string
  start_time?: string
  end_time?: string
  subject_id?: string
  subject_name?: string
  subject_code?: string
  faculty_id?: string
  faculty_name?: string
  batch_id?: string
  batch_ids?: string[]
  batch_name?: string
  student_ids?: string[]
  classroom_id?: string
  room_number?: string
  duration_minutes?: number
  department_id?: string
  department_name?: string   // ← ye add karo
  department_code?: string   // ← ye add karo
}

interface QualityMetrics {
  total_conflicts?: number
  hard_constraint_violations?: number
  soft_constraint_violations?: number
  room_utilization_score?: number
  faculty_workload_balance_score?: number
  student_compactness_score?: number
  overall_score?: number
}

interface Statistics {
  total_classes?: number
  total_hours?: number
  unique_subjects?: number
  unique_faculty?: number
  unique_rooms?: number
  average_classes_per_day?: number
}

interface TimetableVariant {
  id: string
  job_id: string
  variant_number: number
  optimization_priority?: string
  organization_id: string
  department_id?: string
  semester?: number
  academic_year?: string
  timetable_entries: TimetableEntry[]
  statistics: Statistics
  quality_metrics: QualityMetrics
  is_selected?: boolean
  selected_at?: string | null
  selected_by?: number | null
  generated_at: string
}

interface TimetableWorkflow {
  id: string
  variant: string | null
  job_id: string
  organization_id: string
  department_id: string
  semester: number
  academic_year: string
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published'
  created_by: number
  created_at: string
  submitted_for_review_at: string | null
  submitted_by: number | null
  published_at: string | null
  published_by: number | null
  timetable_entries: TimetableEntry[]
}

interface Review {
  id: string
  timetable: string
  reviewer: number
  reviewer_name: string
  reviewer_username: string
  action: 'approved' | 'rejected' | 'revision_requested'
  comments: string
  suggested_changes: any | null
  reviewed_at: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Convert 24-hour time to 12-hour format with AM/PM
function formatTime12Hour(time24: string): string {
  if (!time24) return time24
  const match = time24.match(/(\d{1,2}):(\d{2})/)
  if (!match) return time24
  
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

// Format time range from start to end
function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return start || end || ''
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`
}

// 12 perceptually-distinct accent colours — Google Calendar style.
// Each entry is just one saturated colour; the card itself stays neutral
// (surface background + 3 px left border) so text is always legible.
const SUBJECT_PALETTES: { accent: string }[] = [
  { accent: '#4285f4' }, // blue
  { accent: '#0f9d58' }, // green
  { accent: '#9334e6' }, // purple
  { accent: '#ea4335' }, // red
  { accent: '#fa7b17' }, // orange
  { accent: '#00897b' }, // teal
  { accent: '#1e88e5' }, // indigo-blue
  { accent: '#e91e63' }, // pink
  { accent: '#7cb342' }, // lime-green
  { accent: '#f9ab00' }, // amber
  { accent: '#00acc1' }, // cyan
  { accent: '#8d6e63' }, // warm brown
]

// Deterministic palette index from a string key
function subjectPaletteIndex(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  return Math.abs(h) % SUBJECT_PALETTES.length
}

// ── Adapter: TimetableVariant → VariantSummary (for VariantGrid/VariantCard) ────────
function toVariantSummary(
  v: TimetableVariant,
  isRecommended: boolean,
): VariantSummary {
  const qm = v.quality_metrics ?? {}
  const scoreCard: VariantScoreCard = {
    overall_score:          qm.overall_score            ?? 0,
    score_faculty_load:     qm.faculty_workload_balance_score ?? -1,
    score_room_utilization: qm.room_utilization_score   ?? -1,
    score_student_gaps:     qm.student_compactness_score ?? -1,
    total_conflicts:        qm.total_conflicts           ?? qm.hard_constraint_violations ?? 0,
    soft_violation_count:   qm.soft_constraint_violations ?? 0,
    optimization_label:     v.optimization_priority?.replace(/_/g, ' ') ?? 'Balanced',
    is_recommended:         isRecommended,
  }
  return {
    id:              v.id,
    job_id:          v.job_id,
    variant_number:  v.variant_number,
    organization_id: v.organization_id,
    timetable_entries: [],   // not needed for card display
    statistics: {
      total_classes: (v.statistics as Record<string, number>)?.total_classes ?? 0,
      total_conflicts: qm.total_conflicts ?? (v.statistics as Record<string, number>)?.total_conflicts ?? 0,
    },
    quality_metrics: scoreCard,
    generated_at:    v.generated_at,
  }
}

// ── Adapter: TimetableEntry → TimetableSlotDetailed (for SlotDetailPanel) ─────
function toSlotDetailed(e: TimetableEntry, day: number): TimetableSlotDetailed {
  const timeKey = e.start_time && e.end_time
    ? `${e.start_time}-${e.end_time}`
    : e.time_slot
  return {
    day,
    time_slot:           timeKey,
    subject_code:        e.subject_code        ?? '',
    subject_name:        e.subject_name        ?? e.subject_code ?? '',
    faculty_id:          e.faculty_id          ?? '',
    faculty_name:        e.faculty_name        ?? 'Unknown',
    room_number:         e.room_number         ?? '',
    batch_name:          e.batch_name          ?? '',
    department_id:       e.department_id       ?? '',
    year:                undefined,
    section:             undefined,
    has_conflict:        false,
    conflict_description: undefined,
    enrolled_count:      undefined,
    room_capacity:       undefined,
  } as unknown as TimetableSlotDetailed
}

// ---------------------------------------------------------------------------
// localStorage-backed variant entry cache
// Timetable entries are immutable once generated, so we can cache them for
// 30 minutes across navigations without risk of showing stale data.
// ---------------------------------------------------------------------------
const LS_ENTRY_TTL_MS = 30 * 60 * 1000 // 30 minutes

function lsReadEntries(variantId: string): TimetableEntry[] | null {
  try {
    const raw = localStorage.getItem(`tt_entries_${variantId}`)
    if (!raw) return null
    const { ts, entries } = JSON.parse(raw) as { ts: number; entries: TimetableEntry[] }
    if (Date.now() - ts > LS_ENTRY_TTL_MS) {
      localStorage.removeItem(`tt_entries_${variantId}`)
      return null
    }
    return entries
  } catch {
    return null
  }
}

function lsWriteEntries(variantId: string, entries: TimetableEntry[]): void {
  try {
    localStorage.setItem(`tt_entries_${variantId}`, JSON.stringify({ ts: Date.now(), entries }))
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export default function TimetableReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast, showInfoToast } = useToast()
  const workflowId = params.id as string

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  const [workflow, setWorkflow] = useState<TimetableWorkflow | null>(null)
  const [variants, setVariants] = useState<TimetableVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  // ── Split loading into two phases ───────────────────────────────────
  // loadingMeta: blocks full page (only until workflow + variants list arrive)
  // loadingEntries: inline skeleton inside the timetable grid area only
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loading, setLoading] = useState(true) // keep for error/redirect guards
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null)

  // ── Per-variant entry cache – avoids re-fetching when user switches back ──
  const entryCache = useRef<Map<string, TimetableEntry[]>>(new Map())
  // AbortController ref so switching variants cancels the in-flight request
  const entryAbortRef = useRef<AbortController | null>(null)
  // Guard against the stale-cache race: if the backend cache still has
  // status='running' but the job really just completed (e.g. Celery hasn't
  // flushed the cache yet), we retry a few times before giving up and
  // redirecting to the status page.  Backend fix (workflow_views.py) stops
  // caching non-terminal states, so this counter fires at most once in practice.
  const runningRetryRef = useRef(0)
  const MAX_RUNNING_RETRIES = 3

  // Guard against the variant-not-yet-ready race: FastAPI writes status=completed
  // to Redis (firing the SSE 'done' event) and then writes timetable_data to the
  // DB.  The Celery cache-warm task also runs asynchronously.  If the review page
  // loads before either write is visible, the variants list comes back empty.
  // We retry a few times (2 s apart) so the page self-heals without user action.
  const variantRetryRef = useRef(0)
  const MAX_VARIANT_RETRIES = 3

  // ── Lazy-render the timetable grid via IntersectionObserver ─────────────
  // BUG FIX: The previous code put the observer in useEffect([gridInView]).
  // On first load: activeVariant=null → section not in DOM → ref is null →
  // effect returned early with no observer. Then setActiveVariant() mounted the
  // section, but useEffect([activeVariant?.id]) called setGridInView(false) which
  // was already false → React skipped re-render → observer effect never re-ran →
  // section sat in DOM with no observer → skeleton showed forever.
  //
  // FIX: use activeVariant?.id as the sole dep so the effect re-runs exactly
  // when the section transitions from unmounted → mounted (null → variant set).
  // gridInView stays true across variant switches (renderTimetableGrid handles
  // its own loading skeleton), so there is no reason to reset it.
  const gridSectionRef = useRef<HTMLElement>(null)
  const [gridInView, setGridInView] = useState(false)

  // Modals
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  // View state
  const [activeVariant, setActiveVariant] = useState<TimetableVariant | null>(null)
  const [activeDay, setActiveDay] = useState<number | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [departmentScopeEntries, setDepartmentScopeEntries] = useState<TimetableEntry[] | null>(null)
  const [viewScope, setViewScope] = useState<'department' | 'faculty' | 'student'>('department')
  const [facultyLookup, setFacultyLookup] = useState('')
  const [facultyLookupLoading, setFacultyLookupLoading] = useState(false)
  const [facultyScopeEntries, setFacultyScopeEntries] = useState<TimetableEntry[] | null>(null)
  const [resolvedFacultyId, setResolvedFacultyId] = useState<string | null>(null)
  const [studentLookup, setStudentLookup] = useState('')
  const [studentLookupLoading, setStudentLookupLoading] = useState(false)
  const [studentScopeEntries, setStudentScopeEntries] = useState<TimetableEntry[] | null>(null)
  const [resolvedStudentId, setResolvedStudentId] = useState<string | null>(null)
  // SlotDetailPanel state — open on cell click
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlotDetailed | null>(null)

  const handleSlotClick = useCallback((slot: TimetableSlotDetailed) => {
    setSelectedSlot((prev) => {
      if (
        prev &&
        prev.day === slot.day &&
        prev.time_slot === slot.time_slot &&
        prev.subject_code === slot.subject_code &&
        prev.faculty_id === slot.faculty_id &&
        prev.room_number === slot.room_number
      ) {
        return null
      }
      return slot
    })
  }, [])
  // Department display-name lookup (UUID → { name, code })
  const [deptNames, setDeptNames] = useState<Map<string, { name: string; code: string }>>(() => new Map())

  const pickDefaultVariant = useCallback((list: TimetableVariant[]): TimetableVariant | undefined => {
    if (!list.length) return undefined
    return list.find(v => v.variant_number === 1) ?? list[0]
  }, [])

  // Re-attach observer whenever the active variant changes (including null → first variant).
  // rootMargin 400px means the grid starts building before it even enters the viewport.
  useEffect(() => {
    const el = gridSectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setGridInView(true) },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [activeVariant?.id])  // ← key fix: runs when section first mounts (null→id transition)

  useEffect(() => {
    if (workflowId) {
      runningRetryRef.current = 0  // reset retries on fresh navigation
      variantRetryRef.current = 0  // reset variant retries on fresh navigation
      loadWorkflowData()
    }
  }, [workflowId])

  // Load department names once on mount for department labels in the selector
  useEffect(() => {
    fetchDepartmentNames().then(setDeptNames).catch(() => {})
  }, [])

  /**
   * Fetch workflow metadata + variants list in parallel (Round 1), then fetch
   * first-variant entries in the background (Round 2) WITHOUT blocking the UI.
   *
   * Round 1 result → page renders immediately with variant cards + scores.
   * Round 2 result → timetable grid fills in once entries arrive.
   *
   * On every variant click: check entryCache first — hit → instant paint,
   * miss → fetch with AbortController cancelling any in-flight request.
   */
  const loadWorkflowData = async () => {
    try {
      setLoading(true)
      setLoadingMeta(true)
      setError(null)

      // ── Round 1: fire both independent requests simultaneously ──────────────
      // NOTE: We intentionally skip GET /generation-jobs/{id}/ here.
      // That endpoint returns the full GenerationJob including timetable_data
      // (5-50 MB). The workflow endpoint returns job.status, which is all we
      // need to decide whether to redirect to the status page.
      const [workflowRes, variantsRes] = await Promise.all([
        authenticatedFetch(`${API_BASE}/timetable/workflows/${workflowId}/`, { credentials: 'include' }),
        authenticatedFetch(`${API_BASE}/timetable/variants/?job_id=${workflowId}`, { credentials: 'include' }),
      ])

      if (!workflowRes.ok) {
        if (workflowRes.status === 401 || workflowRes.status === 403) {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
          return
        }
        throw new Error(`Failed to load workflow (${workflowRes.status})`)
      }

      const [workflowData, variantsRaw] = await Promise.all([
        workflowRes.json(),
        variantsRes.ok ? variantsRes.json() : Promise.resolve([]),
      ])
      // Handle both plain array `[...]` and paginated `{results: [...], count: N}` responses
      const variantsData: TimetableVariant[] = Array.isArray(variantsRaw)
        ? variantsRaw
        : (variantsRaw?.results ?? [])

      // Re-route if job is still running (status field is in the workflow response)
      if (workflowData.status === 'running' || workflowData.status === 'queued') {
        // Guard against the stale-DB race condition: FastAPI may have written
        // status=completed to Redis and triggered the SSE done event (causing the
        // status page to navigate here), but the FastAPI→DB write may have failed
        // silently (e.g. Neon connection pool exhausted).  The backend Redis
        // cross-check in workflow_views.py will heal the DB on the NEXT request.
        //
        // Retry strategy:
        // - Attempts 1-3 (1.5 s apart): re-fetch — backend self-heals via Redis
        //   cross-check, so attempt 2 or 3 should return 'completed'.
        // - Attempt 4+: the DB is definitively stuck.  Do NOT redirect back to the
        //   status page (that causes the infinite loop).  Instead, override the
        //   status to 'completed' and try to render the review page with whatever
        //   variants are already available — variants are written to DB separately
        //   and are likely intact even when the job status row is stuck.
        if (runningRetryRef.current < MAX_RUNNING_RETRIES) {
          runningRetryRef.current += 1
          setLoadingMeta(false)
          setLoading(false)
          await new Promise(resolve => setTimeout(resolve, 1500))
          await loadWorkflowData()
          return
        }
        // Retries exhausted: treat as completed to break the redirect loop.
        // The backend Redis cross-check will update the DB on the next normal visit.
        runningRetryRef.current = 0
        workflowData.status = 'completed'
      }
      runningRetryRef.current = 0

      setWorkflow(workflowData)
      setVariants(variantsData)

      const variantToLoad = pickDefaultVariant(variantsData)

      if (!variantToLoad) {
        // If the job is in a terminal state but variants are empty, the Celery
        // cache-warm task or the DB write may still be in-flight.  Retry a few
        // times (2 s apart) before giving up and showing the empty state.
        const isTerminal = workflowData.status === 'completed' ||
          workflowData.status === 'approved' ||
          workflowData.status === 'pending_review'
        if (isTerminal && variantRetryRef.current < MAX_VARIANT_RETRIES) {
          variantRetryRef.current += 1
          // Keep loadingMeta=true (skeleton shows) during the wait
          await new Promise(resolve => setTimeout(resolve, 2000))
          await loadWorkflowData()
          return
        }
        variantRetryRef.current = 0
        setLoadingMeta(false)
        return
      }
      variantRetryRef.current = 0

      setSelectedVariantId(variantToLoad.id)
      // ── Show variant cards NOW – entries load in background ──────────────
      setActiveVariant(variantToLoad)
      const firstDeptId = (variantToLoad.timetable_entries ?? []).find(e => !!e.department_id)?.department_id ?? 'all'
      setDepartmentFilter(firstDeptId)
      setDepartmentScopeEntries(null)
      setFacultyScopeEntries(null)
      setResolvedFacultyId(null)
      setStudentScopeEntries(null)
      setResolvedStudentId(null)
      setActiveDay('all')
      setLoadingMeta(false)  // ←← page is visible from this point on

      // ── Round 2: entries in background (non-blocking) ────────────────────
      setLoadingVariantId(variantToLoad.id)
      try {
        // Check in-memory cache first, then localStorage (survives navigation)
        const cached = entryCache.current.get(variantToLoad.id) ?? lsReadEntries(variantToLoad.id)
        if (cached) {
          entryCache.current.set(variantToLoad.id, cached) // re-warm in-memory cache
          setActiveVariant({ ...variantToLoad, timetable_entries: cached })
        } else {
          // 45 s hard timeout — remote DB can hang indefinitely without this
          const r2Controller = new AbortController()
          const r2Timeout = setTimeout(() => r2Controller.abort(), 45_000)
          try {
            const entriesRes = await authenticatedFetch(
              `${API_BASE}/timetable/variants/${variantToLoad.id}/entries/?job_id=${variantToLoad.job_id}`,
              { credentials: 'include', signal: r2Controller.signal }
            )
            if (entriesRes.ok) {
              const entriesData = await entriesRes.json()
              const entries: TimetableEntry[] = entriesData.timetable_entries
              entryCache.current.set(variantToLoad.id, entries)
              lsWriteEntries(variantToLoad.id, entries) // persist across navigations
              setActiveVariant(prev =>
                prev?.id === variantToLoad.id ? { ...prev, timetable_entries: entries } : prev
              )
            }
          } finally {
            clearTimeout(r2Timeout)
          }
        }
      } catch {
        // entries failed – page still usable with empty grid
      } finally {
        setLoadingVariantId(null)
      }
    } catch (err) {
      console.error('Failed to load workflow:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timetable data')
      setLoadingMeta(false)
    } finally {
      setLoading(false)
    }
  }

  const handleVariantSelect = async (variantId: string) => {
    try {
      setActionLoading(true)
      const response = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${variantId}/select/`,
        { method: 'POST', credentials: 'include' }
      )

      if (!response.ok) throw new Error('Failed to select variant')

      setSelectedVariantId(variantId)
      // ── Update local state only – no full reload needed ─────────────────
      setVariants(prev => prev.map(v => ({ ...v, is_selected: v.id === variantId })))
      showSuccessToast('Variant selected successfully')
    } catch (err) {
      console.error('Failed to select variant:', err)
      showErrorToast('Failed to select variant. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedVariantId) {
      showInfoToast('Please select a variant first')
      return
    }

    try {
      setActionLoading(true)
      const response = await authenticatedFetch(
        `${API_BASE}/timetable/workflows/${workflowId}/approve/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ comments: approvalComments }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to approve timetable')
      }

      showSuccessToast('Timetable approved successfully!')
      setShowApprovalModal(false)
      router.push('/admin/timetables')
    } catch (err) {
      console.error('Failed to approve:', err)
      showErrorToast('Failed to approve timetable. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showInfoToast('Please provide a reason for rejection')
      return
    }

    try {
      setActionLoading(true)
      const response = await authenticatedFetch(
        `${API_BASE}/timetable/workflows/${workflowId}/reject/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ comments: rejectionReason }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to reject timetable')
      }

      showInfoToast('Timetable rejected')
      setShowRejectionModal(false)
      router.push('/admin/timetables')
    } catch (err) {
      console.error('Failed to reject:', err)
      showErrorToast('Failed to reject timetable. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

// Build stable subject → accent colour mapping from the active variant's entries.
  // (variants[] carries empty timetable_entries; actual entries are in activeVariant)
  const subjectPaletteMap = useMemo(() => {
    const map = new Map<string, string>() // key → accent hex
    ;(activeVariant?.timetable_entries || []).forEach(e => {
      const key = e.subject_id ?? e.subject_code ?? ''
      if (key && !map.has(key)) {
        map.set(key, SUBJECT_PALETTES[subjectPaletteIndex(key)].accent)
      }
    })
    return map
  }, [activeVariant?.timetable_entries])

  const baseScopedEntries = useMemo(() => {
    if (viewScope === 'student') return studentScopeEntries ?? []
    if (viewScope === 'faculty') return facultyScopeEntries ?? []
    if (viewScope === 'department') return departmentScopeEntries ?? (activeVariant?.timetable_entries ?? [])
    return activeVariant?.timetable_entries ?? []
  }, [viewScope, studentScopeEntries, facultyScopeEntries, departmentScopeEntries, activeVariant?.timetable_entries])

  const entriesForGrid = useMemo(() => baseScopedEntries, [baseScopedEntries])

  const applyStudentScope = useCallback(async () => {
    const lookup = studentLookup.trim()
    if (!lookup || !activeVariant) return

    setStudentLookupLoading(true)
    setSelectedSlot(null)
    try {
      const params = new URLSearchParams({
        job_id: activeVariant.job_id,
        scope_type: 'student',
        scope_value: lookup,
      })
      const res = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${activeVariant.id}/scope_view/?${params.toString()}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error('Student scope lookup failed')
      const data = await res.json()
      setStudentScopeEntries(data.timetable_entries ?? [])
      const resolved = data?.resolved_scope?.student_id
      setResolvedStudentId(typeof resolved === 'string' ? resolved : null)
      setDepartmentFilter('all')
      setDepartmentScopeEntries(null)
      setActiveDay('all')
    } catch {
      showErrorToast('Unable to load student schedule for this variant.')
    } finally {
      setStudentLookupLoading(false)
    }
  }, [studentLookup, activeVariant, API_BASE, showErrorToast])

  const applyFacultyScope = useCallback(async () => {
    const lookup = facultyLookup.trim()
    if (!lookup || !activeVariant) return

    setFacultyLookupLoading(true)
    setSelectedSlot(null)
    try {
      const params = new URLSearchParams({
        job_id: activeVariant.job_id,
        scope_type: 'faculty',
        scope_value: lookup,
      })
      const res = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${activeVariant.id}/scope_view/?${params.toString()}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error('Faculty scope lookup failed')
      const data = await res.json()
      setFacultyScopeEntries(data.timetable_entries ?? [])
      const resolved = data?.resolved_scope?.faculty_id
      setResolvedFacultyId(typeof resolved === 'string' ? resolved : null)
      setDepartmentFilter('all')
      setDepartmentScopeEntries(null)
      setActiveDay('all')
    } catch {
      showErrorToast('Unable to load faculty schedule for this variant.')
    } finally {
      setFacultyLookupLoading(false)
    }
  }, [facultyLookup, activeVariant, API_BASE, showErrorToast])

  const applyDepartmentScope = useCallback(async (deptId: string) => {
    if (!activeVariant) return
    setDepartmentFilter(deptId)
    setSelectedSlot(null)
    setActiveDay('all')

    if (deptId === 'all') {
      setDepartmentScopeEntries(null)
      return
    }

    try {
      const params = new URLSearchParams({
        job_id: activeVariant.job_id,
        scope_type: 'department',
        scope_value: deptId,
      })
      const res = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${activeVariant.id}/scope_view/?${params.toString()}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error('Department scope lookup failed')
      const data = await res.json()
      setDepartmentScopeEntries(data.timetable_entries ?? [])
    } catch {
      showErrorToast('Unable to load department timetable for this variant.')
    }
  }, [activeVariant, API_BASE, showErrorToast])

  const loadVariantEntries = useCallback(async (variant: TimetableVariant) => {
    // ── Instant paint from in-memory cache ──────────────────────────────────
    const memCached = entryCache.current.get(variant.id)
    if (memCached) {
      setActiveVariant({ ...variant, timetable_entries: memCached })
      setActiveDay('all')
      setDepartmentFilter('all')
      setDepartmentScopeEntries(null)
      setFacultyScopeEntries(null)
      setResolvedFacultyId(null)
      setStudentScopeEntries(null)
      setResolvedStudentId(null)
      setTimeout(() => {
        document.getElementById('timetable-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return
    }

    // ── localStorage hit (survives navigation, 30-min TTL) ──────────────────
    const lsCached = lsReadEntries(variant.id)
    if (lsCached) {
      entryCache.current.set(variant.id, lsCached) // re-warm in-memory cache
      setActiveVariant({ ...variant, timetable_entries: lsCached })
      setActiveDay('all')
      setDepartmentFilter('all')
      setDepartmentScopeEntries(null)
      setFacultyScopeEntries(null)
      setResolvedFacultyId(null)
      setStudentScopeEntries(null)
      setResolvedStudentId(null)
      setTimeout(() => {
        document.getElementById('timetable-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return
    }

    // ── Cache miss: show variant card immediately then load entries ────────
    setActiveVariant(variant) // show empty grid + skeleton right away
    setLoadingVariantId(variant.id)
    setActiveDay('all')
    setDepartmentFilter('all')
    setDepartmentScopeEntries(null)
    setFacultyScopeEntries(null)
    setResolvedFacultyId(null)
    setStudentScopeEntries(null)
    setResolvedStudentId(null)

    // Cancel any pending in-flight request for a different variant
    if (entryAbortRef.current) entryAbortRef.current.abort()
    const controller = new AbortController()
    entryAbortRef.current = controller

    // Hard timeout: abort if the server hasn't responded in 45 s.
    // Remote DBs (Render free tier) can hang indefinitely without this.
    const timeoutId = setTimeout(() => controller.abort(), 45_000)

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${variant.id}/entries/?job_id=${variant.job_id}`,
        { credentials: 'include', signal: controller.signal }
      )
      if (response.ok) {
        const data = await response.json()
        const entries: TimetableEntry[] = data.timetable_entries
        entryCache.current.set(variant.id, entries) // store for future switches
        lsWriteEntries(variant.id, entries)         // persist across navigations
        // Only update if this variant is still the active one
        setActiveVariant(prev =>
          prev?.id === variant.id ? { ...prev, timetable_entries: entries } : prev
        )
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        console.error('Failed to load entries:', err)
      }
    } finally {
      clearTimeout(timeoutId)
      if (!controller.signal.aborted) setLoadingVariantId(null)
      setTimeout(() => {
        document.getElementById('timetable-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [API_BASE])

  useEffect(() => {
    if (!activeVariant) return
    const ids = Array.from(new Set(
      (activeVariant.timetable_entries ?? [])
        .map(e => e.department_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ))
    if (ids.length === 0) return
    if (departmentFilter === 'all' || !ids.includes(departmentFilter)) {
      setDepartmentFilter(ids[0])
      if (viewScope === 'department') {
        void applyDepartmentScope(ids[0])
      }
    }
  }, [activeVariant, departmentFilter, viewScope, applyDepartmentScope])

  const renderTimetableGrid = (variant: TimetableVariant) => {
    const entries = variant.timetable_entries ?? []

    // Show grid skeleton while entries are still loading for this variant
    if (loadingVariantId === variant.id && entries.length === 0) {
      return <TimetableGridSkeleton days={5} slots={8} />
    }

    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium">No timetable entries loaded.</p>
          <p className="text-xs mt-1 opacity-70">The server may be slow. Click retry to try again.</p>
          <button onClick={() => loadVariantEntries(variant)} className="mt-4 btn-primary text-xs">
            Retry
          </button>
        </div>
      )
    }

    // Filter by department
    const deptFiltered = departmentFilter === 'all'
      ? entries
      : entries.filter(e => e.department_id === departmentFilter)

    // Filter by selected day
    const dayFiltered = activeDay === 'all'
      ? deptFiltered
      : deptFiltered.filter(e => e.day === activeDay)

    // Build grid: key = "dayIndex-timeSlot" using start_time-end_time range
    const grid: Record<string, TimetableEntry[]> = {}
    dayFiltered.forEach(entry => {
      const timeKey = entry.start_time && entry.end_time 
        ? `${entry.start_time}-${entry.end_time}` 
        : entry.time_slot
      const key = `${entry.day}-${timeKey}`
      if (!grid[key]) grid[key] = []
      grid[key].push(entry)
    })

    const timeSlots = Array.from(
      new Set(deptFiltered.map(e => 
        e.start_time && e.end_time ? `${e.start_time}-${e.end_time}` : e.time_slot
      ).filter(Boolean))
    ).sort()

    const daysToShow = activeDay === 'all' ? DAYS.map((_, i) => i) : [activeDay as number]

    // Build subject legend entries
    const legendItems: Array<{ key: string; label: string; name: string; accent: string }> = []
    const seenKeys = new Set<string>()
    deptFiltered.forEach(e => {
      const key = e.subject_id ?? e.subject_code ?? ''
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key)
        const accent = subjectPaletteMap.get(key) ?? SUBJECT_PALETTES[0].accent
        legendItems.push({ key, label: e.subject_code ?? key, name: e.subject_name ?? e.subject_code ?? key, accent })
      }
    })

    return (
      <div className="space-y-4">
        {/* Day tabs */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 0, 1, 2, 3, 4] as const).map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeDay === d
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-subtle)]'
              }`}
            >
              {d === 'all' ? 'All Days' : DAY_SHORT[d as number]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto rounded-xl shadow-sm print:shadow-none border border-[var(--color-border)]">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-surface-2)]">
                <th className="sticky left-0 z-10 px-3 py-3 text-left font-semibold uppercase tracking-wider border-b border-r border-[var(--color-border)] w-24 min-w-[6rem] bg-[var(--color-bg-surface-2)] text-[var(--color-text-muted)]">
                  Time
                </th>
                {daysToShow.map(di => (
                  <th
                    key={di}
                    className="px-3 py-3 text-center font-semibold uppercase tracking-wider border-b border-r border-[var(--color-border)] min-w-[8rem] text-[var(--color-text-secondary)]"
                  >
                    {DAYS[di]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.length === 0 ? (
                <tr>
                  <td colSpan={daysToShow.length + 1} className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                    No classes scheduled for this filter
                  </td>
                </tr>
              ) : timeSlots.map(time => (
                <tr key={time} className="group transition-colors border-b border-[var(--color-border)]">
                  <td
                    className="sticky left-0 z-10 px-3 py-3 font-medium border-r border-[var(--color-border)] whitespace-nowrap align-top bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]"
                  >
                    {time.includes('-') ? formatTimeRange(...time.split('-') as [string, string]) : time}
                  </td>
                  {daysToShow.map(di => {
                    const cellEntries = grid[`${di}-${time}`] ?? []
                    return (
                      <td key={di} className="px-2 py-2 align-top border-r border-[var(--color-border)]">
                        {cellEntries.length > 0 ? (
                          <div className="space-y-1.5">
                            {cellEntries.map((entry, idx) => {
                              const key = entry.subject_id ?? entry.subject_code ?? ''
                              const accent = subjectPaletteMap.get(key) ?? SUBJECT_PALETTES[0].accent
                              // Hex alpha: 18 = ~10% for tint background
                              const bgTint = `${accent}18`
                              const slotDetailed = toSlotDetailed(entry, di)
                              return (
                                <div
                                  key={idx}
                                  className="rounded-md overflow-hidden cursor-pointer"
                                  style={{
                                    borderLeft: `3px solid ${accent}`,
                                    background: bgTint,
                                  }}
                                  onClick={() => setSelectedSlot(slotDetailed)}
                                  title="Click for details"
                                >
                                  <div className="px-2 pt-1.5 pb-1.5 space-y-0.5">
                                    {/* Subject code — accent coloured, tight */}
                                    <div className="text-[10px] font-bold leading-none tracking-wide uppercase truncate" style={{ color: accent }}>
                                      {entry.subject_code ?? '—'}
                                    </div>
                                    {/* Subject name */}
                                    <div className="font-semibold text-[11px] leading-tight truncate text-[var(--color-text-primary)]">
                                      {entry.subject_name ?? entry.subject_code ?? '—'}
                                    </div>
                                    {/* Faculty */}
                                    {entry.faculty_name && (
                                      <div className="text-[10px] leading-tight truncate text-[var(--color-text-secondary)]">
                                        {entry.faculty_name}
                                      </div>
                                    )}
                                    {/* Room · Batch · Duration */}
                                    {(entry.room_number || entry.batch_name || entry.duration_minutes) && (
                                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        {entry.room_number && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[var(--color-text-muted)]">
                                            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5" />
                                            </svg>
                                            {entry.room_number}
                                          </span>
                                        )}
                                        {entry.batch_name && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[var(--color-text-muted)]">
                                            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                            </svg>
                                            {entry.batch_name}
                                          </span>
                                        )}
                                        {entry.duration_minutes && (
                                          <span className="text-[9px] font-medium text-[var(--color-text-muted)]">
                                            {entry.duration_minutes}m
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="h-full min-h-[2rem] flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Subject legend */}
        {legendItems.length > 0 && (
          <div className="pt-2 print:pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--color-text-muted)]">
              Subject Legend
            </p>
            <div className="flex flex-wrap gap-2">
              {legendItems.map(({ key, label, name, accent }) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
                  style={{ background: `${accent}18`, borderLeft: `3px solid ${accent}` }}
                >
                  <span className="font-bold text-[10px] uppercase tracking-wide leading-none" style={{ color: accent }}>
                    {label}
                  </span>
                  <span className="font-medium text-[var(--color-text-secondary)]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Best variant = highest overall score
  const bestVariantId = variants.reduce<string | null>((best, v) => {
    if (!best) return v.id
    const prev = variants.find(x => x.id === best)
    return (v.quality_metrics?.overall_score ?? 0) > (prev?.quality_metrics?.overall_score ?? 0)
      ? v.id : best
  }, null)

  // ── Memoised adapters ───────────────────────────────────────────────────────
  const variantSummaries = useMemo(
    () => variants.map(v => toVariantSummary(v, v.id === bestVariantId)),
    [variants, bestVariantId],
  )

  const departmentOptions = useMemo((): DepartmentOption[] => {
    const seen = new Set<string>()
    const opts: DepartmentOption[] = []
    ;(activeVariant?.timetable_entries ?? []).forEach(e => {
      if (e.department_id && !seen.has(e.department_id)) {
        seen.add(e.department_id)
        const resolved = deptNames.get(e.department_id)
        const name = resolved?.name ?? e.department_name ?? e.department_id
        const code = resolved?.code ?? e.department_code ?? e.department_id
        opts.push({
          id:   e.department_id,
          name,
          code,
        })
      }
    })
    return opts
  }, [activeVariant?.timetable_entries, deptNames])

  const effectiveDepartmentFilter = useMemo(
    () => (viewScope === 'department' ? departmentFilter : 'all'),
    [viewScope, departmentFilter],
  )

  // Block the full page ONLY while workflow metadata + variant list are loading.
  // Entries for the grid load in the background and show an inline skeleton.
  if (loadingMeta) {
    return (
      <div className="space-y-6">
        {/* Title shows instantly — identical to loading.tsx so no visual flash */}
        <PageHeader
          title="Review Timetable"
          parentLabel="Timetables"
          parentHref="/admin/timetables"
        />
        {/* Variant cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <VariantCardSkeleton />
          <VariantCardSkeleton />
          <VariantCardSkeleton />
        </div>
        {/* Timetable grid skeleton */}
        <TimetableGridSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-[var(--color-danger-subtle)]">
            <XCircle size={32} className="text-[var(--color-danger-text)]" />
          </div>
          <div>
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">Failed to Load</p>
            <p className="text-sm mt-1 text-[var(--color-text-secondary)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; badge: string }> = {
    approved:       { label: 'Approved',       badge: 'badge badge-success' },
    rejected:       { label: 'Rejected',        badge: 'badge badge-danger'  },
    pending_review: { label: 'Pending Review',  badge: 'badge badge-warning' },
    published:      { label: 'Published',       badge: 'badge badge-info'    },
    draft:          { label: 'Draft',           badge: 'badge badge-neutral' },
  }
  const status = workflow?.status ?? 'draft'
  const statusInfo = statusConfig[status] ?? statusConfig.draft

  const activeStats = activeVariant?.statistics
  const activeMetrics = activeVariant?.quality_metrics

  const uniqueDepartments = Array.from(
    new Set((activeVariant?.timetable_entries ?? []).map(e => e.department_id).filter(Boolean))
  )

  return (
    <div className="space-y-6 print:bg-white">

      {/* ── Page Header ── */}
      <PageHeader
        title="Review Timetable"
        parentLabel="Timetables"
        parentHref="/admin/timetables"
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusInfo.badge}>{statusInfo.label}</span>
            {workflow?.status === 'draft' && (
              <>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  disabled={!selectedVariantId || actionLoading}
                  className="btn-success flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={15} />
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectionModal(true)}
                  disabled={actionLoading}
                  className="btn-danger flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={15} />
                  Reject
                </button>
              </>
            )}
          </div>
        }
      />
      {/* Subtitle: department · semester · year */}
      {workflow && (
        <p className="-mt-4 text-sm text-[var(--color-text-secondary)]">
          {workflow.department_id && <span className="font-medium text-[var(--color-text-primary)]">{workflow.department_id}</span>}
          {workflow.semester && <span> · Semester {workflow.semester}</span>}
          {workflow.academic_year && <span> · {workflow.academic_year}</span>}
        </p>
      )}

        {/* ── Variant Cards — powered by VariantGrid ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Generated Variants
              <span className="ml-2 badge badge-neutral font-normal">{variants.length}</span>
            </h2>
          </div>

          <VariantGrid
            variants={variantSummaries}
            jobStatus={workflow?.status ?? 'draft'}
            loading={loadingMeta}
            activeVariantId={activeVariant?.id ?? null}
            onViewDetails={(id) => {
              const v = variants.find(x => x.id === id)
              if (v) loadVariantEntries(v)
            }}
            onCompare={(ids) =>
              router.push(`/admin/timetables/${workflowId}/compare?a=${ids[0]}&b=${ids[1]}`)
            }
            onPickVariant={(id) => handleVariantSelect(id)}
          />
        </section>

        {/* ── Timetable View ── */}
        {activeVariant && (
          <section
            id="timetable-view"
            ref={gridSectionRef}
            className="card overflow-hidden"
          >
            {/* Audience scope controls */}
            <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface-2)] print:hidden">
              <div className="flex flex-wrap lg:flex-nowrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  View Scope
                  <select
                    value={viewScope}
                    onChange={(e) => {
                      const next = e.target.value as 'department' | 'faculty' | 'student'
                      setViewScope(next)
                      setSelectedSlot(null)
                      setDepartmentFilter('all')
                      setDepartmentScopeEntries(null)
                      setActiveDay('all')
                      if (next !== 'faculty') {
                        setFacultyScopeEntries(null)
                        setResolvedFacultyId(null)
                        setFacultyLookup('')
                      }
                      if (next !== 'student') {
                        setStudentScopeEntries(null)
                        setResolvedStudentId(null)
                        setStudentLookup('')
                      }
                    }}
                    className="input-primary h-9 min-w-[180px]"
                    aria-label="Choose timetable scope"
                  >
                    <option value="department">Department View</option>
                    <option value="faculty">Faculty View</option>
                    <option value="student">Student View</option>
                  </select>
                </label>

                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                    Select Department
                    <select
                      value={departmentFilter === 'all' && departmentOptions.length > 0 ? departmentOptions[0].id : departmentFilter}
                      onChange={(e) => {
                        setViewScope('department')
                        void applyDepartmentScope(e.target.value)
                      }}
                      className="input-primary h-9 w-[280px]"
                      aria-label="Department dropdown"
                      disabled={departmentOptions.length === 0}
                    >
                      {departmentOptions.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </label>
                </div>

                {viewScope === 'faculty' && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                      Faculty (ID, Code, Username, or Email)
                      <input
                        value={facultyLookup}
                        onChange={(e) => setFacultyLookup(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void applyFacultyScope()
                          }
                        }}
                        className="input-primary h-9 w-[280px]"
                        placeholder="e.g. FAC-001 or UUID"
                        aria-label="Faculty lookup"
                      />
                    </label>
                    <button
                      onClick={() => void applyFacultyScope()}
                      disabled={facultyLookupLoading || !facultyLookup.trim()}
                      className="btn-primary h-9 px-3 text-xs disabled:opacity-50"
                    >
                      {facultyLookupLoading ? 'Loading…' : 'Apply'}
                    </button>
                    <button
                      onClick={() => {
                        setFacultyScopeEntries(null)
                        setResolvedFacultyId(null)
                        setFacultyLookup('')
                        setDepartmentFilter('all')
                        setActiveDay('all')
                      }}
                      className="btn-secondary h-9 px-3 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {viewScope === 'faculty' && resolvedFacultyId && (
                  <span className="badge badge-info">Resolved Faculty: {resolvedFacultyId}</span>
                )}

                {viewScope === 'student' && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                      Student (ID, Enrollment No, Roll No, or Username)
                      <input
                        value={studentLookup}
                        onChange={(e) => setStudentLookup(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void applyStudentScope()
                          }
                        }}
                        className="input-primary h-9 w-[280px]"
                        placeholder="e.g. BT23CSE001"
                        aria-label="Student lookup"
                      />
                    </label>
                    <button
                      onClick={() => void applyStudentScope()}
                      disabled={studentLookupLoading || !studentLookup.trim()}
                      className="btn-primary h-9 px-3 text-xs disabled:opacity-50"
                    >
                      {studentLookupLoading ? 'Loading…' : 'Apply'}
                    </button>
                    <button
                      onClick={() => {
                        setStudentScopeEntries(null)
                        setResolvedStudentId(null)
                        setStudentLookup('')
                        setDepartmentFilter('all')
                        setActiveDay('all')
                      }}
                      className="btn-secondary h-9 px-3 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {viewScope === 'student' && resolvedStudentId && (
                  <span className="badge badge-info">Resolved Student: {resolvedStudentId}</span>
                )}

                <button
                  onClick={() => window.print()}
                  className="btn-secondary flex items-center gap-1.5 h-9 px-3 text-xs print:hidden lg:ml-auto shrink-0"
                >
                  <Printer size={14} />
                  Print
                </button>

              </div>
            </div>

            

            {/* Body: grid */}
            <div className="flex items-start">
              {/* ─ Grid + SlotDetailPanel ─ */}
              <div className="flex-1 min-w-0 relative">
                <div className="px-4 py-4 sm:px-5 sm:py-5">
                  {gridInView
                    ? <TimetableGridFiltered
                        entries={entriesForGrid as BackendTimetableEntry[]}
                        departmentFilter={effectiveDepartmentFilter}
                        activeDay={activeDay}
                        onDayChange={setActiveDay}
                        isLoading={loadingVariantId === activeVariant.id && (activeVariant.timetable_entries ?? []).length === 0}
                        onSlotClick={handleSlotClick}
                        onRetry={() => loadVariantEntries(activeVariant)}
                      />
                    : <TimetableGridSkeleton days={5} slots={8} />
                  }
                </div>

                {/* Slide-in detail panel */}
                <SlotDetailPanel
                  slot={selectedSlot}
                  onClose={() => setSelectedSlot(null)}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Approval Modal ── */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="card rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-success-subtle)]">
                  <CheckCircle size={20} className="text-[var(--color-success-text)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Approve Timetable</h3>
              </div>
              <p className="text-sm mb-4 text-[var(--color-text-secondary)]">
                This will approve the selected variant and make it available for publishing.
              </p>
              <textarea
                value={approvalComments}
                onChange={e => setApprovalComments(e.target.value)}
                placeholder="Optional comments for approvers…"
                className="input-primary w-full mb-4 resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowApprovalModal(false)} disabled={actionLoading} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleApprove} disabled={actionLoading} className="btn-success text-sm disabled:opacity-50">
                  {actionLoading ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rejection Modal ── */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="card rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-danger-subtle)]">
                  <XCircle size={20} className="text-[var(--color-danger-text)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Reject Timetable</h3>
              </div>
              <p className="text-sm mb-4 text-[var(--color-text-secondary)]">
                Please provide a reason so the scheduling team can make improvements.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)…"
                className="input-primary w-full mb-4 resize-none"
                rows={4}
                required
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRejectionModal(false)} disabled={actionLoading} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading || !rejectionReason.trim()} className="btn-danger text-sm disabled:opacity-50">
                  {actionLoading ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  )
}
