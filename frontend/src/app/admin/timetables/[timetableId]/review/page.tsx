/**
 * Timetable Variant Review & Approval Page
 * Multi-variant comparison with rich timetable visualization
 * Matches backend: TimetableWorkflow, TimetableVariant models
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import { useAuth } from '@/context/AuthContext'
import { authenticatedFetch } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { TimetableGridSkeleton } from '@/components/LoadingSkeletons'

// Backend types matching Django models
interface TimetableEntry {
  day: number // 0-4 (Monday-Friday)
  time_slot: string
  start_time?: string
  end_time?: string
  subject_id?: string
  subject_name?: string
  subject_code?: string
  faculty_id?: string
  faculty_name?: string
  batch_id?: string
  batch_name?: string
  classroom_id?: string
  room_number?: string
  duration_minutes?: number
  department_id?: string
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

// SVG donut score ring
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(Math.max(score, 0), 100)
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="[transition:stroke-dasharray_0.6s_ease]"
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        fill="currentColor"
        fontSize={size < 64 ? 11 : 14}
        fontWeight={700}
        className="[transform:rotate(90deg)] [transform-origin:center]"
        style={{ fill: 'var(--color-text-primary)' }}
      >
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}

// Thin labelled metric bar
function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max(value ?? 0, 0), 100)
  const barColor = pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-surface-3)' }}>
        <div
          className="h-full rounded-full transition-all duration-500 [width:var(--pct)]"
          aria-label={`${label}: ${pct.toFixed(0)}%`}
          style={{ '--pct': `${pct}%`, background: barColor } as React.CSSProperties}
        />
      </div>
    </div>
  )
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
  const workflowId = params.timetableId as string

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
      loadWorkflowData()
    }
  }, [workflowId])

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

      const [workflowData, variantsData] = await Promise.all([
        workflowRes.json(),
        variantsRes.ok ? variantsRes.json() : Promise.resolve([]),
      ])

      // Re-route if job is still running (status field is in the workflow response)
      if (workflowData.status === 'running' || workflowData.status === 'queued') {
        router.push(`/admin/timetables/status/${workflowId}`)
        return
      }

      setWorkflow(workflowData)
      setVariants(variantsData)

      const selected = variantsData.find((v: TimetableVariant) => v.is_selected)
      const variantToLoad: TimetableVariant | undefined = selected ?? variantsData[0]

      if (!variantToLoad) {
        setLoadingMeta(false)
        return
      }

      setSelectedVariantId(variantToLoad.id)
      // ── Show variant cards NOW – entries load in background ──────────────
      setActiveVariant(variantToLoad)
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

  const loadVariantEntries = useCallback(async (variant: TimetableVariant) => {
    // ── Instant paint from in-memory cache ──────────────────────────────────
    const memCached = entryCache.current.get(variant.id)
    if (memCached) {
      setActiveVariant({ ...variant, timetable_entries: memCached })
      setActiveDay('all')
      setDepartmentFilter('all')
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

  const renderTimetableGrid = (variant: TimetableVariant) => {
    const entries = variant.timetable_entries ?? []

    // Show grid skeleton while entries are still loading for this variant
    if (loadingVariantId === variant.id && entries.length === 0) {
      return <TimetableGridSkeleton days={5} slots={8} />
    }

    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium">No timetable entries loaded.</p>
          <p className="text-xs mt-1 opacity-70">The server may be slow. Click retry to try again.</p>
          <button
            onClick={() => loadVariantEntries(variant)}
            className="mt-4 btn-primary text-xs"
          >
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
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={activeDay === d
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg-surface-2)', color: 'var(--color-text-secondary)' }
              }
            >
              {d === 'all' ? 'All Days' : DAY_SHORT[d as number]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto rounded-xl shadow-sm print:shadow-none" style={{ border: '1px solid var(--color-border)' }}>
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: 'var(--color-bg-surface-2)' }}>
                <th className="sticky left-0 z-10 px-3 py-3 text-left font-semibold uppercase tracking-wider border-b border-r w-24 min-w-[6rem]" style={{ background: 'var(--color-bg-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  Time
                </th>
                {daysToShow.map(di => (
                  <th
                    key={di}
                    className="px-3 py-3 text-center font-semibold uppercase tracking-wider border-b border-r min-w-[8rem]"
                    style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                  >
                    {DAYS[di]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.length === 0 ? (
                <tr>
                  <td colSpan={daysToShow.length + 1} className="py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No classes scheduled for this filter
                  </td>
                </tr>
              ) : timeSlots.map(time => (
                <tr key={time} className="group transition-colors" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td
                    className="sticky left-0 z-10 px-3 py-3 font-medium border-r whitespace-nowrap align-top"
                    style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                  >
                    {time.includes('-') ? formatTimeRange(...time.split('-') as [string, string]) : time}
                  </td>
                  {daysToShow.map(di => {
                    const cellEntries = grid[`${di}-${time}`] ?? []
                    return (
                      <td key={di} className="px-2 py-2 align-top border-r" style={{ borderColor: 'var(--color-border)' }}>
                        {cellEntries.length > 0 ? (
                          <div className="space-y-1.5">
                            {cellEntries.map((entry, idx) => {
                              const key = entry.subject_id ?? entry.subject_code ?? ''
                              const accent = subjectPaletteMap.get(key) ?? SUBJECT_PALETTES[0].accent
                              // Hex alpha: 18 = ~10% for tint background
                              const bgTint = `${accent}18`
                              return (
                                <div
                                  key={idx}
                                  className="rounded-md overflow-hidden"
                                  style={{
                                    borderLeft: `3px solid ${accent}`,
                                    background: bgTint,
                                  }}
                                >
                                  <div className="px-2 pt-1.5 pb-1.5 space-y-0.5">
                                    {/* Subject code — accent coloured, tight */}
                                    <div className="text-[10px] font-bold leading-none tracking-wide uppercase truncate" style={{ color: accent }}>
                                      {entry.subject_code ?? '—'}
                                    </div>
                                    {/* Subject name */}
                                    <div className="font-semibold text-[11px] leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
                                      {entry.subject_name ?? entry.subject_code ?? '—'}
                                    </div>
                                    {/* Faculty */}
                                    {entry.faculty_name && (
                                      <div className="text-[10px] leading-tight truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                        {entry.faculty_name}
                                      </div>
                                    )}
                                    {/* Room · Batch · Duration */}
                                    {(entry.room_number || entry.batch_name || entry.duration_minutes) && (
                                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        {entry.room_number && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5" />
                                            </svg>
                                            {entry.room_number}
                                          </span>
                                        )}
                                        {entry.batch_name && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                            </svg>
                                            {entry.batch_name}
                                          </span>
                                        )}
                                        {entry.duration_minutes && (
                                          <span className="text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
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
                            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
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
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
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
                  <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Block the full page ONLY while workflow metadata + variant list are loading.
  // Entries for the grid load in the background and show an inline skeleton.
  if (loadingMeta) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '60vh' }}>
        <GoogleSpinner size={56} className="mx-auto" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading timetable variants…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--color-danger-subtle)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--color-danger-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Failed to Load</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin/timetables')}
            className="btn-primary text-sm"
          >
            ← Back to Timetables
          </button>
        </div>
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
      <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              <button
                onClick={() => router.push('/admin/timetables')}
                className="hover:underline transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Timetables
              </button>
              <span>/</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Review Variants</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Timetable Review
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {workflow?.department_id && <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{workflow.department_id}</span>}
              {workflow?.semester && <span> · Semester {workflow.semester}</span>}
              {workflow?.academic_year && <span> · {workflow.academic_year}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={statusInfo.badge}>
              {statusInfo.label}
            </span>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            {workflow?.status === 'draft' && (
              <>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  disabled={!selectedVariantId || actionLoading}
                  className="btn-success flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectionModal(true)}
                  disabled={actionLoading}
                  className="btn-danger flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Variant Cards ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Generated Variants
              <span className="ml-2 badge badge-neutral font-normal">
                {variants.length}
              </span>
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click a variant to preview its timetable below</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {variants.map(variant => {
              const isActive = activeVariant?.id === variant.id
              const isBest = variant.id === bestVariantId && variants.length > 1
              const isLoading = loadingVariantId === variant.id
              const qm = variant.quality_metrics ?? {}
              const st = variant.statistics ?? {}
              return (
                <div
                  key={variant.id}
                  onClick={() => loadVariantEntries(variant)}
                  className={`relative flex flex-col rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden`}
                  style={isActive
                    ? { borderColor: 'var(--color-primary)', background: 'var(--color-bg-surface)', boxShadow: 'var(--shadow-card)' }
                    : { borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }
                  }
                >
                  {/* Top accent stripe */}
                  <div
                    className="h-1 w-full"
                    style={{ background: isActive ? 'var(--color-primary)' : 'var(--color-border)' }}
                  />

                  {/* Badges row */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="badge badge-info flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Viewing
                        </span>
                      )}
                      {isBest && (
                        <span className="badge badge-warning">
                          ★ Best
                        </span>
                      )}
                      {variant.is_selected && (
                        <span className="badge badge-success">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex-1 flex flex-col">
                    {/* Score ring + title */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                        <ScoreRing score={qm.overall_score ?? 0} size={64} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                          Variant {variant.variant_number}
                        </p>
                        <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-text-muted)' }}>
                          {variant.optimization_priority?.replace(/_/g, ' ') ?? 'Standard'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: (qm.total_conflicts ?? 0) === 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}
                          >
                            {(qm.total_conflicts ?? 0) === 0 ? '✓ No conflicts' : `${qm.total_conflicts} conflict${qm.total_conflicts === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metric bars */}
                    <div className="space-y-2 mb-4">
                      <MetricBar label="Room Utilization" value={qm.room_utilization_score ?? 0} />
                      <MetricBar label="Faculty Balance" value={qm.faculty_workload_balance_score ?? 0} />
                      <MetricBar label="Compactness" value={qm.student_compactness_score ?? 0} />
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
                      {[
                        { label: 'Classes', val: st.total_classes ?? 0 },
                        { label: 'Hours', val: st.total_hours ?? 0 },
                        { label: 'Subjects', val: st.unique_subjects ?? 0 },
                      ].map(({ label, val }) => (
                        <div key={label} className="rounded-lg py-1.5 px-1" style={{ background: 'var(--color-bg-surface-2)' }}>
                          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action button */}
                    <div className="mt-auto flex gap-2">
                      {isLoading ? (
                        <div className="flex-1 flex items-center justify-center py-2">
                          <GoogleSpinner size={16} />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); loadVariantEntries(variant) }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors`}
                            style={isActive
                              ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }
                              : { background: 'var(--color-bg-surface-2)', color: 'var(--color-text-secondary)' }
                            }
                          >
                            {isActive ? 'Currently Viewing' : 'View Timetable'}
                          </button>
                          {!variant.is_selected && (
                            <button
                              onClick={e => { e.stopPropagation(); handleVariantSelect(variant.id) }}
                              disabled={actionLoading}
                              className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                            >
                              Select
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Timetable View ── */}
        {activeVariant && (
          <section
            id="timetable-view"
            ref={gridSectionRef}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
          >
            {/* Section header */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div>
                <h2 className="card-title">
                  Variant {activeVariant.variant_number} — Timetable
                </h2>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-text-muted)' }}>
                  {activeVariant.optimization_priority?.replace(/_/g, ' ') ?? 'Standard'} &nbsp;·&nbsp;
                  Generated {new Date(activeVariant.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Department filter */}
                {uniqueDepartments.length > 1 && (
                  <select
                    value={departmentFilter}
                    onChange={async e => {
                      const deptId = e.target.value
                      setDepartmentFilter(deptId)
                      if (deptId !== 'all' && activeVariant) {
                        try {
                          const res = await authenticatedFetch(
                            `${API_BASE}/timetable/variants/${activeVariant.id}/department_view/?department_id=${deptId}&job_id=${activeVariant.job_id}`,
                            { credentials: 'include' }
                          )
                          if (res.ok) {
                            const data = await res.json()
                            setActiveVariant({ ...activeVariant, timetable_entries: data.timetable_entries })
                          }
                        } catch (err) {
                          console.error('Failed to fetch department view:', err)
                        }
                      } else {
                        const full = variants.find(v => v.id === activeVariant.id)
                        if (full) setActiveVariant(full)
                      }
                    }}
                    aria-label="Filter by department"
                    className="input-primary px-2.5 py-1.5 text-xs"
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}

                {/* Print button */}
                <button
                  onClick={() => window.print()}
                  className="btn-secondary flex items-center gap-1.5 text-xs print:hidden"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>

            {/* Statistics strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 print:hidden" style={{ borderBottom: '1px solid var(--color-border)' }}>
              {[
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  ),
                  label: 'Total Classes', val: activeStats?.total_classes ?? 0,
                },
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ),
                  label: 'Total Hours', val: activeStats?.total_hours ?? 0,
                },
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m7-10h.01M12 15h.01" /></svg>
                  ),
                  label: 'Unique Rooms', val: activeStats?.unique_rooms ?? 0,
                },
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ),
                  label: 'Faculty Members', val: activeStats?.unique_faculty ?? 0,
                },
              ].map(({ icon, label, val }) => (
                <div key={label} className="px-5 py-3 text-center" style={{ borderRight: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {icon}
                    <p className="text-xs">{label}</p>
                  </div>
                  <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Grid — only built once the section enters the viewport */}
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {gridInView
                ? renderTimetableGrid(activeVariant)
                : <TimetableGridSkeleton days={5} slots={8} />
              }
            </div>
          </section>
        )}

        {/* ── Approval Modal ── */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="rounded-2xl shadow-[var(--shadow-modal)] p-6 max-w-md w-full" style={{ background: 'var(--color-bg-surface)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-success-subtle)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--color-success-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Approve Timetable</h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
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
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={actionLoading}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn-success text-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rejection Modal ── */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="rounded-2xl shadow-[var(--shadow-modal)] p-6 max-w-md w-full" style={{ background: 'var(--color-bg-surface)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-danger-subtle)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--color-danger-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Reject Timetable</h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
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
                <button
                  onClick={() => setShowRejectionModal(false)}
                  disabled={actionLoading}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="btn-danger text-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  )
}
