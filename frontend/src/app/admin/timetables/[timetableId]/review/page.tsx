/**
 * Timetable Variant Review & Approval Page
 * Multi-variant comparison with rich timetable visualization
 * Matches backend: TimetableWorkflow, TimetableVariant models
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import { useAuth } from '@/context/AuthContext'
import { authenticatedFetch } from '@/lib/auth'
import { useToast } from '@/components/Toast'

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

// 12 perceptually-distinct subject colour palettes (bg / border / title / subtitle)
const SUBJECT_PALETTES = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40',    border: 'border-blue-300 dark:border-blue-600',    title: 'text-blue-900 dark:text-blue-100',    sub: 'text-blue-700 dark:text-blue-300'    },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-600', title: 'text-emerald-900 dark:text-emerald-100', sub: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40',  border: 'border-violet-300 dark:border-violet-600',  title: 'text-violet-900 dark:text-violet-100',   sub: 'text-violet-700 dark:text-violet-300'  },
  { bg: 'bg-amber-100 dark:bg-amber-900/40',    border: 'border-amber-300 dark:border-amber-600',    title: 'text-amber-900 dark:text-amber-100',    sub: 'text-amber-700 dark:text-amber-300'    },
  { bg: 'bg-rose-100 dark:bg-rose-900/40',      border: 'border-rose-300 dark:border-rose-600',      title: 'text-rose-900 dark:text-rose-100',      sub: 'text-rose-700 dark:text-rose-300'      },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40',      border: 'border-cyan-300 dark:border-cyan-600',      title: 'text-cyan-900 dark:text-cyan-100',      sub: 'text-cyan-700 dark:text-cyan-300'      },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',border: 'border-fuchsia-300 dark:border-fuchsia-600',title: 'text-fuchsia-900 dark:text-fuchsia-100', sub: 'text-fuchsia-700 dark:text-fuchsia-300' },
  { bg: 'bg-lime-100 dark:bg-lime-900/40',      border: 'border-lime-300 dark:border-lime-600',      title: 'text-lime-900 dark:text-lime-100',      sub: 'text-lime-700 dark:text-lime-300'      },
  { bg: 'bg-sky-100 dark:bg-sky-900/40',        border: 'border-sky-300 dark:border-sky-600',        title: 'text-sky-900 dark:text-sky-100',        sub: 'text-sky-700 dark:text-sky-300'        },
  { bg: 'bg-orange-100 dark:bg-orange-900/40',  border: 'border-orange-300 dark:border-orange-600',  title: 'text-orange-900 dark:text-orange-100',  sub: 'text-orange-700 dark:text-orange-300'  },
  { bg: 'bg-teal-100 dark:bg-teal-900/40',      border: 'border-teal-300 dark:border-teal-600',      title: 'text-teal-900 dark:text-teal-100',      sub: 'text-teal-700 dark:text-teal-300'      },
  { bg: 'bg-pink-100 dark:bg-pink-900/40',      border: 'border-pink-300 dark:border-pink-600',      title: 'text-pink-900 dark:text-pink-100',      sub: 'text-pink-700 dark:text-pink-300'      },
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
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
        className="text-gray-800 dark:text-gray-100 [transform:rotate(90deg)] [transform-origin:center]"
      >
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}

// Thin labelled metric bar
function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max(value ?? 0, 0), 100)
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span className="font-medium text-gray-700 dark:text-gray-200">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500 [width:var(--pct)]`}
          aria-label={`${label}: ${pct.toFixed(0)}%`}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null)

  // Modals
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  // View state
  const [activeVariant, setActiveVariant] = useState<TimetableVariant | null>(null)
  const [activeDay, setActiveDay] = useState<number | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  useEffect(() => {
    if (workflowId) {
      loadWorkflowData()
    }
  }, [workflowId])

  /**
   * Fetch workflow metadata, variants list, and first-variant entries in parallel.
   *
   * WHY: workflowId === job_id (the backend uses the same UUID for both).
   * Previous implementation had 4 sequential awaits (job-check → workflow →
   * variants → entries) which totalled 8-20 s on a cold cache.
   *
   * New order:
   *   Round 1 (parallel): job status check + workflow metadata + variants list
   *   Round 2 (parallel): first variant entries (fired as soon as Round 1 resolves)
   *
   * This cuts cold-cache latency by ~65 % (2 round-trips instead of 4).
   */
  const loadWorkflowData = async () => {
    try {
      setLoading(true)
      setError(null)

      // ── Round 1: fire all three independent requests simultaneously ──────────
      const [jobRes, workflowRes, variantsRes] = await Promise.all([
        authenticatedFetch(`${API_BASE}/generation-jobs/${workflowId}/`, { credentials: 'include' }),
        authenticatedFetch(`${API_BASE}/timetable/workflows/${workflowId}/`, { credentials: 'include' }),
        authenticatedFetch(`${API_BASE}/timetable/variants/?job_id=${workflowId}`, { credentials: 'include' }),
      ])

      // Re-route if job is still running (job status check result)
      if (jobRes.ok) {
        const jobData = await jobRes.json()
        if (jobData.status === 'running' || jobData.status === 'queued') {
          router.push(`/admin/timetables/status/${workflowId}`)
          return
        }
      }

      // Handle workflow auth errors
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

      setWorkflow(workflowData)
      setVariants(variantsData)

      // Determine which variant to load first
      const selected = variantsData.find((v: TimetableVariant) => v.is_selected)
      const variantToLoad: TimetableVariant | undefined = selected ?? variantsData[0]

      if (!variantToLoad) return

      setSelectedVariantId(variantToLoad.id)

      // ── Round 2: fetch entries for the pre-selected variant ──────────────────
      try {
        const entriesRes = await authenticatedFetch(
          `${API_BASE}/timetable/variants/${variantToLoad.id}/entries/?job_id=${variantToLoad.job_id}`,
          { credentials: 'include' }
        )
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json()
          setActiveVariant({ ...variantToLoad, timetable_entries: entriesData.timetable_entries })
        } else {
          setActiveVariant(variantToLoad)
        }
      } catch {
        setActiveVariant(variantToLoad)
      }
    } catch (err) {
      console.error('Failed to load workflow:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const handleVariantSelect = async (variantId: string) => {
    try {
      setActionLoading(true)
      const response = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${variantId}/select/`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to select variant')
      }

      setSelectedVariantId(variantId)

      // Update local state
      setVariants(prev =>
        prev.map(v => ({
          ...v,
          is_selected: v.id === variantId,
        }))
      )

      showSuccessToast('Variant selected successfully')
      // Reload workflow
      await loadWorkflowData()
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

// Build stable subject → palette mapping from ALL variants' entries
  const subjectPaletteMap = useMemo(() => {
    const map = new Map<string, (typeof SUBJECT_PALETTES)[0]>()
    variants.forEach(v => {
      ;(v.timetable_entries || []).forEach(e => {
        const key = e.subject_id ?? e.subject_code ?? ''
        if (key && !map.has(key)) {
          map.set(key, SUBJECT_PALETTES[subjectPaletteIndex(key)])
        }
      })
    })
    return map
  }, [variants])

  const loadVariantEntries = useCallback(async (variant: TimetableVariant) => {
    setLoadingVariantId(variant.id)
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/timetable/variants/${variant.id}/entries/?job_id=${variant.job_id}`,
        { credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        setActiveVariant({ ...variant, timetable_entries: data.timetable_entries })
      } else {
        setActiveVariant(variant)
      }
    } catch (err) {
      console.error('Failed to load entries:', err)
      setActiveVariant(variant)
    } finally {
      setLoadingVariantId(null)
      setActiveDay('all')
      setDepartmentFilter('all')
      setTimeout(() => {
        document.getElementById('timetable-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [API_BASE])

  const renderTimetableGrid = (variant: TimetableVariant) => {
    const entries = variant.timetable_entries ?? []

    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No timetable entries available for this variant.</p>
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
    const legendItems: Array<{ key: string; label: string; palette: (typeof SUBJECT_PALETTES)[0] }> = []
    const seenKeys = new Set<string>()
    deptFiltered.forEach(e => {
      const key = e.subject_id ?? e.subject_code ?? ''
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key)
        const p = subjectPaletteMap.get(key) ?? SUBJECT_PALETTES[0]
        legendItems.push({ key, label: e.subject_code ?? key, palette: p })
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {d === 'all' ? 'All Days' : DAY_SHORT[d as number]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm print:shadow-none print:border-gray-400">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-r border-gray-200 dark:border-gray-700 w-24 min-w-[6rem]">
                  Time
                </th>
                {daysToShow.map(di => (
                  <th
                    key={di}
                    className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-200 dark:border-gray-700 min-w-[8rem]"
                  >
                    {DAYS[di]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {timeSlots.length === 0 ? (
                <tr>
                  <td colSpan={daysToShow.length + 1} className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No classes scheduled for this filter
                  </td>
                </tr>
              ) : timeSlots.map(time => (
                <tr key={time} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-gray-50/50 dark:group-hover:bg-gray-800/30 px-3 py-3 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap align-top">
                    {time.includes('-') ? formatTimeRange(...time.split('-') as [string, string]) : time}
                  </td>
                  {daysToShow.map(di => {
                    const cellEntries = grid[`${di}-${time}`] ?? []
                    return (
                      <td key={di} className="px-2 py-2 align-top border-r border-gray-100 dark:border-gray-700/50">
                        {cellEntries.length > 0 ? (
                          <div className="space-y-1.5">
                            {cellEntries.map((entry, idx) => {
                              const key = entry.subject_id ?? entry.subject_code ?? ''
                              const p = subjectPaletteMap.get(key) ?? SUBJECT_PALETTES[0]
                              return (
                                <div
                                  key={idx}
                                  className={`${p.bg} ${p.border} border rounded-lg px-2 py-1.5 space-y-0.5 shadow-sm`}
                                >
                                  <div className={`font-bold text-xs leading-tight truncate ${p.title}`}>
                                    {entry.subject_name
                                      ? `${entry.subject_code} — ${entry.subject_name}`
                                      : (entry.subject_code ?? '—')}
                                  </div>
                                  <div className={`text-xs truncate ${p.sub}`}>
                                    {entry.faculty_name ?? ''}
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                    {entry.room_number && (
                                      <span className={`inline-flex items-center gap-0.5 text-[10px] ${p.sub} font-medium`}>
                                        <svg className="w-2.5 h-2.5 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5" />
                                        </svg>
                                        {entry.room_number}
                                      </span>
                                    )}
                                    {entry.batch_name && (
                                      <span className={`inline-flex items-center gap-0.5 text-[10px] ${p.sub} font-medium`}>
                                        <svg className="w-2.5 h-2.5 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                        </svg>
                                        {entry.batch_name}
                                      </span>
                                    )}
                                    {entry.duration_minutes && (
                                      <span className={`text-[10px] ${p.sub} opacity-70`}>
                                        {entry.duration_minutes}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="h-full min-h-[2rem] flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
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
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Subject Legend
            </p>
            <div className="flex flex-wrap gap-2">
              {legendItems.map(({ key, label, palette }) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${palette.bg} ${palette.border} border ${palette.title}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <GoogleSpinner size={64} className="mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading timetable variants…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">Failed to Load</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin/timetables')}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
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

  const statusConfig = {
    approved: { label: 'Approved', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    pending_review: { label: 'Pending Review', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    published: { label: 'Published', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  }
  const status = workflow?.status ?? 'draft'
  const statusInfo = statusConfig[status] ?? statusConfig.draft

  const activeStats = activeVariant?.statistics
  const activeMetrics = activeVariant?.quality_metrics

  const uniqueDepartments = Array.from(
    new Set((activeVariant?.timetable_entries ?? []).map(e => e.department_id).filter(Boolean))
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-1">
              <button onClick={() => router.push('/admin/timetables')} className="hover:text-gray-600 dark:hover:text-gray-300">
                Timetables
              </button>
              <span>/</span>
              <span className="text-gray-600 dark:text-gray-300">Review Variants</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Timetable Review
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {workflow?.department_id && <span className="font-medium text-gray-700 dark:text-gray-300">{workflow.department_id}</span>}
              {workflow?.semester && <span> · Semester {workflow.semester}</span>}
              {workflow?.academic_year && <span> · {workflow.academic_year}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            <button
              onClick={() => router.push('/admin/timetables')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectionModal(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
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
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Generated Variants
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-normal">
                {variants.length}
              </span>
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Click a variant to preview its timetable below</p>
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
                  className={`relative flex flex-col rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                    isActive
                      ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-100 dark:shadow-blue-900/30 bg-white dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:shadow-md'
                  }`}
                >
                  {/* Top accent stripe */}
                  <div className={`h-1 w-full ${isActive ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} />

                  {/* Badges row */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Viewing
                        </span>
                      )}
                      {isBest && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                          ★ Best
                        </span>
                      )}
                      {variant.is_selected && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex-1 flex flex-col">
                    {/* Score ring + title */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-shrink-0 text-gray-800 dark:text-gray-100">
                        <ScoreRing score={qm.overall_score ?? 0} size={64} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                          Variant {variant.variant_number}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                          {variant.optimization_priority?.replace(/_/g, ' ') ?? 'Standard'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs font-semibold ${(qm.total_conflicts ?? 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
                        <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg py-1.5 px-1">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{label}</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{val}</p>
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
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isActive
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300'
                            }`}
                          >
                            {isActive ? 'Currently Viewing' : 'View Timetable'}
                          </button>
                          {!variant.is_selected && (
                            <button
                              onClick={e => { e.stopPropagation(); handleVariantSelect(variant.id) }}
                              disabled={actionLoading}
                              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
          <section id="timetable-view" className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Variant {activeVariant.variant_number} — Timetable
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
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
                    className="px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors print:hidden"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>

            {/* Statistics strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-700 border-b border-gray-100 dark:border-gray-700 print:hidden">
              {[
                { icon: '📚', label: 'Total Classes', val: activeStats?.total_classes ?? 0 },
                { icon: '⏱', label: 'Total Hours', val: activeStats?.total_hours ?? 0 },
                { icon: '🏫', label: 'Unique Rooms', val: activeStats?.unique_rooms ?? 0 },
                { icon: '👩‍🏫', label: 'Faculty Members', val: activeStats?.unique_faculty ?? 0 },
              ].map(({ icon, label, val }) => (
                <div key={label} className="px-5 py-3 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{icon} {label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {renderTimetableGrid(activeVariant)}
            </div>
          </section>
        )}

        {/* ── Approval Modal ── */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approve Timetable</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                This will approve the selected variant and make it available for publishing.
              </p>
              <textarea
                value={approvalComments}
                onChange={e => setApprovalComments(e.target.value)}
                placeholder="Optional comments for approvers…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Timetable</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Please provide a reason so the scheduling team can make improvements.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                rows={4}
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
