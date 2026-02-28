'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { TimetableListSkeleton } from '@/components/LoadingSkeletons'
import { useProgress } from '@/hooks/useProgress'
import type { TimetableListItem } from '@/types/timetable'

interface RunningJob {
  job_id: string
  progress: number
  status: string
  message: string
  time_remaining_seconds?: number | null
  department?: string
  academic_year?: string
  semester?: number
}

// ── Running job row — subscribes to SSE for real-time progress + ETA ─────────
const STAGE_LABELS: Record<string, string> = {
  loading:        'Reading data',
  clustering:     'Organising courses',
  cpsat_solving:  'Building schedule',
  ga_optimization:'Refining timetable',
  rl_refinement:  'Final polish',
}

function formatETA(seconds: number | null): string {
  if (seconds === null || seconds < 5) return 'Almost done…'
  if (seconds < 60) return `~${Math.round(seconds)}s left`
  return `~${Math.ceil(seconds / 60)}m left`
}

function RunningJobRow({ job, onNavigate, onJobFailed }: { job: RunningJob; onNavigate: () => void; onJobFailed: (jobId: string) => void }) {
  const { progress, isConnected } = useProgress(
    job.job_id,
    undefined,
    () => { onJobFailed(job.job_id) },  // called when SSE reports failed / cancelled
  )

  const isFailed    = progress?.status === 'failed' || progress?.status === 'cancelled'
  const pct         = progress?.overall_progress ?? 0
  const stage       = isFailed
    ? (progress?.status === 'cancelled' ? 'Cancelled' : 'Generation failed')
    : (progress?.stage ? (STAGE_LABELS[progress.stage] ?? progress.stage) : 'Connecting…')
  const eta         = progress?.eta_seconds ?? null
  const hasProgress = pct > 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: isFailed ? 'var(--color-danger-subtle, #fff5f5)' : 'var(--color-bg-page)',
      border: `1px solid ${isFailed ? 'var(--color-danger)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.department ?? 'All Departments'}
          </span>
          {job.academic_year && job.semester && (
            <span style={{
              fontSize: 11, color: 'var(--color-text-muted)',
              background: 'var(--color-bg-surface-2)',
              padding: '1px 7px', borderRadius: 4,
              flexShrink: 0, fontWeight: 500,
            }}>
              {job.academic_year} · Sem {job.semester}
            </span>
          )}
          {isFailed && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-danger-text, #c53030)',
              background: 'var(--color-danger-subtle, #fff5f5)',
              border: '1px solid var(--color-danger)',
              padding: '1px 7px', borderRadius: 4, flexShrink: 0,
            }}>
              {progress?.status === 'cancelled' ? 'Cancelled' : 'Failed'}
            </span>
          )}
        </div>

        {/* Stage + ETA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 12, color: isFailed ? 'var(--color-danger-text, #c53030)' : 'var(--color-text-secondary)' }}>
            {stage}
          </span>
          {!isFailed && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: 8 }}>
              {hasProgress
                ? <>{Math.round(pct)}% &nbsp;<span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{formatETA(eta)}</span></>
                : <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>{isConnected ? formatETA(eta) : 'Connecting…'}</span>
              }
            </span>
          )}
        </div>

        {/* Progress bar — red on failure, blue otherwise */}
        <div style={{ position: 'relative', height: 4, background: 'var(--color-bg-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
          {/* Fill — always visible, min 8% so it shows from the moment the job appears */}
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: isFailed ? '100%' : `${Math.max(pct, 8)}%`,
            background: isFailed ? 'var(--color-danger)' : 'var(--color-primary)',
            borderRadius: 2,
            transition: 'width 600ms ease',
            animation: isFailed ? 'none' : 'progress-fill-breathe 2s ease-in-out infinite',
          }} />
          {/* White shine beam clipped to fill width — only when running */}
          {!isFailed && (
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${Math.max(pct, 8)}%`,
              overflow: 'hidden', borderRadius: 2,
            }}>
              <span style={{
                position: 'absolute', inset: 0, width: '50%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                animation: 'progress-shine 1.8s linear infinite',
              }} />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onNavigate}
        className={isFailed ? 'btn-secondary' : 'btn-primary'}
        style={{ fontSize: 12, height: 32, padding: '0 14px', flexShrink: 0 }}
      >
        {isFailed ? 'View Details' : 'View Progress'}
      </button>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  approved:  { bg: 'var(--color-success-subtle)', text: 'var(--color-success-text)', dot: 'var(--color-success)', label: 'Approved'  },
  completed: { bg: 'var(--color-success-subtle)', text: 'var(--color-success-text)', dot: 'var(--color-success)', label: 'Completed' },
  pending:   { bg: 'var(--color-warning-subtle)', text: 'var(--color-warning-text)', dot: 'var(--color-warning)', label: 'Pending'   },
  running:   { bg: 'var(--color-info-subtle)',    text: 'var(--color-info)',          dot: 'var(--color-primary)', label: 'Running'  },
  draft:     { bg: 'var(--color-bg-surface-2)',   text: 'var(--color-text-secondary)', dot: 'var(--color-text-muted)', label: 'Draft' },
  rejected:  { bg: 'var(--color-danger-subtle)',  text: 'var(--color-danger-text)',   dot: 'var(--color-danger)', label: 'Rejected'  },
  failed:    { bg: 'var(--color-danger-subtle)',  text: 'var(--color-danger-text)',   dot: 'var(--color-danger)', label: 'Failed'    },
}

function StatusChip({ status, isRunning }: { status: string; isRunning?: boolean }) {
  const key   = isRunning ? 'running' : status
  const cfg   = STATUS_CONFIG[key] ?? STATUS_CONFIG['draft']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 12, flexShrink: 0,
      background: cfg.bg, color: cfg.text, fontSize: 12, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ── Metric tile — top-of-page summary cards ───────────────────────────────────
function MetricTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1, fontFamily: "'Poppins', sans-serif" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}

const CACHE_KEY = 'admin_timetables_cache'
const CACHE_TTL_MS = 60_000 // 60 s stale-while-revalidate window

function transformJobs(jobs: any[]): TimetableListItem[] {
  return jobs.map((job: any) => ({
    id: job.job_id || job.id,
    year: parseInt((job.academic_year || '2024').split('-')[0]) || new Date().getFullYear(),
    department: job.organization_name || 'All Departments',
    batch: job.batch?.batch_name || null,
    semester: job.semester || 1,
    academic_year: job.academic_year || '2024-25',
    status: (job.status || 'draft') as TimetableListItem['status'],
    lastUpdated: new Date(job.updated_at || job.created_at).toLocaleDateString(),
    conflicts: job.conflicts_count || 0,
    score: job.quality_score || null,
  }))
}

export default function AdminTimetablesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [timetables, setTimetables] = useState<TimetableListItem[]>(() => {
    // ── Stale-while-revalidate: seed state from sessionStorage immediately ──
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL_MS) return data
      }
    } catch { /* ignore */ }
    return []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  // Running-job poll: derive from main timetables list (no separate fetch)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const emptyPollCount = useRef(0)
  // Jobs that have transitioned to a terminal state via SSE but whose DB status
  // may not have propagated to the timetables list yet.  Excluding them here
  // prevents the failed card from lingering in the running banner between the
  // SSE signal and the next loadTimetableData() response.
  const [terminatedJobIds, setTerminatedJobIds] = useState<Set<string>>(() => new Set())

  const { user } = useAuth()
  const router = useRouter()
  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  // ── Derive running jobs from the main list (no extra API round-trip) ─────
  const runningJobs = useMemo<RunningJob[]>(
    () =>
      timetables
        .filter(t =>
          !terminatedJobIds.has(t.id) &&
          ((t.status as string) === 'running' || t.status === 'pending')
        )
        .map(t => ({
          job_id: t.id,
          progress: 0,
          status: t.status,
          message: t.status === 'pending' ? 'Queued — waiting to start' : 'Generating schedule…',
          time_remaining_seconds: null,
          department: t.department,
          academic_year: t.academic_year,
          semester: t.semester,
        })),
    [timetables, terminatedJobIds]
  )

  const loadTimetableData = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch(
        `${API_BASE}/generation-jobs/?page=${currentPage}&page_size=20`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        setTimetables(prev => prev) // keep stale data visible
        setLoading(false)
        return
      }

      const data = await response.json()
      const jobs = data.results || []
      setTotalCount(data.count || 0)

      const listItems = transformJobs(jobs)
      // Prune terminatedJobIds: only remove IDs that the API now confirms are
      // no longer running/pending. IDs where the DB is stuck at 'running' stay
      // in the set so the running banner never re-shows a job the SSE already
      // reported as failed/cancelled — preventing the infinite reconnect loop.
      setTerminatedJobIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set(prev)
        listItems.forEach((t: TimetableListItem) => {
          const s = t.status as string
          if (s !== 'running' && s !== 'pending') {
            next.delete(t.id)
          }
        })
        return next
      })
      setTimetables(listItems)

      // Background-prefetch variants for the 3 most-recent completed/failed jobs.
      // This warms the Redis cache so clicking any of those timetables is instant,
      // even if Redis has evicted the keys since the initial cache-warm on completion.
      const toPrewarm = listItems
        .filter((t: TimetableListItem) => (t.status as string) === 'completed' || (t.status as string) === 'failed')
        .slice(0, 3)
      toPrewarm.forEach((job: TimetableListItem) => {
        fetch(`${API_BASE}/timetable/variants/?job_id=${job.id}`, {
          credentials: 'include',
        } as RequestInit).catch(() => {}) // fire-and-forget: warms Redis silently
      })

      // Persist to sessionStorage so next navigation is instant
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: listItems, ts: Date.now() }))
      } catch { /* quota exceeded – ignore */ }

      // Stop background polling once no running jobs remain
      const hasActive = listItems.some(t => (t.status as string) === 'running' || t.status === 'pending')
      if (!hasActive) {
        emptyPollCount.current += 1
        if (emptyPollCount.current >= 2 && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else {
        emptyPollCount.current = 0
      }
    } catch (err) {
      console.error('Failed to load timetables:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, API_BASE])

  useEffect(() => {
    loadTimetableData()
  }, [loadTimetableData])

  // Background poll – only keep going while there are active jobs
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      loadTimetableData()
    }, 8_000) // 8 s is plenty for status updates
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [loadTimetableData])

  // ── Pure helper – memoised so it doesn't recompute on every render ────────
  const getGroupedBySemester = useMemo(() => () => {
    const grouped: { [key: string]: TimetableListItem[] } = {}

    // Exclude running/pending jobs — they are shown in the active-jobs banner above,
    // not in the timetables grid (they have no reviewable schedule yet).
    timetables
      .filter(t => (t.status as string) !== 'running' && t.status !== 'pending')
      .forEach(timetable => {
        const key = `${timetable.academic_year}-${timetable.semester}`
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(timetable)
      })

    return grouped
  }, [timetables])

  // ── Derived counts for summary tiles ─────────────────────────────────────
  const counts = useMemo(() => ({
    approved:  timetables.filter(t => t.status === 'approved').length,
    pending:   timetables.filter(t => t.status === 'pending').length,
    draft:     timetables.filter(t => t.status === 'draft').length,
    rejected:  timetables.filter(t => t.status === 'rejected').length,
  }), [timetables])

  const groupedTimetables = getGroupedBySemester()

  // ── Skeleton: first load only (no stale data) ────────────────────────────
  if (loading && timetables.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 74, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }} className="animate-pulse" />
          ))}
        </div>
        <TimetableListSkeleton cards={6} />
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
        <div className="card-header">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 className="card-title" style={{ color: 'var(--color-danger)' }}>Failed to load timetables</h3>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
        <button onClick={loadTimetableData} className="btn-primary mt-4">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── 1. Summary metric tiles ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile value={counts.approved}  label="Approved"  color="var(--color-success-text)" />
        <MetricTile value={counts.pending}   label="Pending"   color="var(--color-warning-text)" />
        <MetricTile value={counts.draft}     label="Draft"     color="var(--color-text-secondary)" />
        <MetricTile value={counts.rejected}  label="Rejected"  color="var(--color-danger-text)" />
      </div>

      {/* ── 2. Page toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            Timetables
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {totalCount} schedule{totalCount !== 1 ? 's' : ''} across all semesters
          </p>
        </div>
        <Link href="/admin/timetables/new" className="btn-primary" style={{ flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="hidden sm:inline">Generate Timetable</span>
          <span className="sm:hidden">Generate</span>
        </Link>
      </div>

      {/* ── 3. Active-jobs banner ────────────────────────────────────────── */}
      {runningJobs.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--color-success)' }}>
          {/* Header */}
          <div className="card-header" style={{ paddingBottom: 12, marginBottom: 16 }}>
            <div className="flex items-center gap-2">
              <span
                className="animate-pulse"
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--color-success)',
                  boxShadow: '0 0 0 3px var(--color-success-subtle)',
                }}
              />
              <h3 className="card-title">
                {runningJobs.length === 1 ? 'Generation in Progress' : `${runningJobs.length} Jobs Running`}
              </h3>
            </div>
            <p className="card-description">
              AI engine is building your timetable
            </p>
          </div>

          {/* Job rows — each subscribes to its own SSE stream */}
          <div className="space-y-3">
            {runningJobs.map(job => (
              <RunningJobRow
                key={job.job_id}
                job={job}
                onNavigate={() => router.push(`/admin/timetables/status/${job.job_id}`)}
                onJobFailed={(jobId) => {
                  // 1. Immediately drop from the running banner
                  setTerminatedJobIds(prev => new Set(prev).add(jobId))
                  // 2. Refresh list so it appears in the grid with failed status
                  loadTimetableData()
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Timetables content ────────────────────────────────────────── */}
      <div>
        {/* Section header + view toggle */}
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Department Timetables
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['grid', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                  borderRadius: 6, cursor: 'pointer', border: '1px solid',
                  borderColor: viewMode === mode ? 'var(--color-primary)' : 'var(--color-border)',
                  background: viewMode === mode ? 'var(--color-primary-subtle)' : 'transparent',
                  color: viewMode === mode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Groups */}
        {Object.keys(groupedTimetables).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>No timetables yet</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
              Generate your first timetable to get started.
            </p>
            <Link href="/admin/timetables/new" className="btn-primary">Generate Timetable</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTimetables)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([semesterKey, items]) => {
                const [academicYear, semester] = semesterKey.split('-')
                return (
                  <div key={semesterKey} className="card">
                    {/* Group header */}
                    <div className="card-header" style={{ paddingBottom: 12 }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="card-title">{academicYear} · Semester {semester}</h3>
                          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                            {items.length} course{items.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                            {items.filter(t => t.status === 'approved').length} approved
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Items — grid or list */}
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items
                          .sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
                          .map(t => {
                            const isRunning = runningJobs.some(j => j.job_id === t.id)
                            const href = isRunning ? `/admin/timetables/status/${t.id}` : `/admin/timetables/${t.id}/review`
                            return (
                              <Link key={t.id} href={href} style={{
                                display: 'block', padding: '14px 16px',
                                background: 'var(--color-bg-page)', border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)', textDecoration: 'none',
                                transition: 'border-color 120ms, background 120ms',
                              }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-subtle)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-page)' }}
                              >
                                <div className="flex items-start justify-between gap-2" style={{ marginBottom: 10 }}>
                                  <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                      {t.department}
                                    </p>
                                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                                      {t.batch ?? 'All Students'}
                                    </p>
                                  </div>
                                  <StatusChip status={t.status} isRunning={isRunning} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                                  <div className="flex items-center justify-between">
                                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Updated</span>
                                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.lastUpdated}</span>
                                  </div>
                                  {t.score != null && (
                                    <div className="flex items-center justify-between">
                                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Quality score</span>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success-text)' }}>{t.score}/10</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Conflicts</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: t.conflicts > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
                                      {t.conflicts}
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {items
                          .sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
                          .map(t => {
                            const isRunning = runningJobs.some(j => j.job_id === t.id)
                            const href = isRunning ? `/admin/timetables/status/${t.id}` : `/admin/timetables/${t.id}/review`
                            return (
                              <Link key={t.id} href={href} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 4px', textDecoration: 'none',
                                borderBottom: '1px solid var(--color-border)',
                                transition: 'background 100ms',
                              }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-subtle)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                    {t.department}
                                  </span>
                                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.batch ?? 'All Students'}</span>
                                </div>
                                <StatusChip status={t.status} isRunning={isRunning} />
                                {t.score != null && (
                                  <span style={{ fontSize: 12, color: 'var(--color-success-text)', fontWeight: 600, flexShrink: 0 }}>
                                    {t.score}/10
                                  </span>
                                )}
                                <span style={{ fontSize: 12, color: t.conflicts > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)', fontWeight: 600, flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
                                  {t.conflicts} conflict{t.conflicts !== 1 ? 's' : ''}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>{t.lastUpdated}</span>
                              </Link>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ── 5. Pagination ───────────────────────────────────────────────── */}
      {totalCount > 20 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="btn-secondary"
            style={{ height: 32, padding: '0 12px', fontSize: 13 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '0 4px' }}>
            Page {currentPage} of {Math.ceil(totalCount / 20)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= Math.ceil(totalCount / 20) || loading}
            className="btn-secondary"
            style={{ height: 32, padding: '0 12px', fontSize: 13 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
