'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { TimetableListSkeleton } from '@/components/LoadingSkeletons'
import type { TimetableListItem } from '@/types/timetable'
import { RunningJobRow } from './components/RunningJobRow'
import { StatusChip } from './components/StatusChip'
import type { RunningJob } from './components/RunningJobRow'

const CACHE_KEY = 'admin_timetables_cache'
const CACHE_TTL_MS = 60_000

function transformJobs(jobs: {
  job_id?: string
  id?: string
  academic_year?: string
  organization_name?: string
  batch?: { batch_name?: string }
  semester?: number
  status?: string
  updated_at?: string
  created_at?: string
  conflicts_count?: number
  quality_score?: number
}[]): TimetableListItem[] {
  return jobs.map(job => ({
    id: job.job_id || job.id || '',
    year: parseInt((job.academic_year || '2024').split('-')[0]) || new Date().getFullYear(),
    department: job.organization_name || 'All Departments',
    batch: job.batch?.batch_name || null,
    semester: job.semester || 1,
    academic_year: job.academic_year || '2024-25',
    status: (job.status || 'draft') as TimetableListItem['status'],
    lastUpdated: new Date(job.updated_at || job.created_at || Date.now()).toLocaleDateString(),
    conflicts: job.conflicts_count || 0,
    score: job.quality_score || null,
  }))
}

export default function AdminTimetablesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [timetables, setTimetables] = useState<TimetableListItem[]>(() => {
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const emptyPollCount = useRef(0)
  const [terminatedJobIds, setTerminatedJobIds] = useState<Set<string>>(() => new Set())

  const { user } = useAuth()
  const router = useRouter()
  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

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
          message: t.status === 'pending' ? 'Queued \u2014 waiting to start' : 'Generating schedule\u2026',
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
        setTimetables(prev => prev)
        setLoading(false)
        return
      }
      const data = await response.json()
      const jobs = data.results || []
      setTotalCount(data.count || 0)
      const listItems = transformJobs(jobs)
      setTerminatedJobIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set(prev)
        listItems.forEach((t: TimetableListItem) => {
          const s = t.status as string
          if (s !== 'running' && s !== 'pending') next.delete(t.id)
        })
        return next
      })
      setTimetables(listItems)
      const toPrewarm = listItems
        .filter((t: TimetableListItem) => (t.status as string) === 'completed' || (t.status as string) === 'failed')
        .slice(0, 3)
      toPrewarm.forEach((job: TimetableListItem) => {
        fetch(`${API_BASE}/timetable/variants/?job_id=${job.id}`, { credentials: 'include' } as RequestInit).catch(() => {})
      })
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: listItems, ts: Date.now() }))
      } catch { /* quota exceeded */ }
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

  useEffect(() => { loadTimetableData() }, [loadTimetableData])

  useEffect(() => {
    pollingRef.current = setInterval(() => { loadTimetableData() }, 8_000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [loadTimetableData])

  const getGroupedBySemester = useMemo(() => () => {
    const grouped: { [key: string]: TimetableListItem[] } = {}
    timetables
      .filter(t => (t.status as string) !== 'running' && t.status !== 'pending')
      .forEach(timetable => {
        const key = `${timetable.academic_year}-${timetable.semester}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(timetable)
      })
    return grouped
  }, [timetables])

  const counts = useMemo(() => ({
    total:          timetables.filter(t => (t.status as string) !== 'running' && t.status !== 'pending').length,
    approved:       timetables.filter(t => t.status === 'approved').length,
    pending_review: timetables.filter(t => t.status === 'pending_review').length,
    draft:          timetables.filter(t => t.status === 'draft').length,
    rejected:       timetables.filter(t => t.status === 'rejected').length,
  }), [timetables])

  const groupedTimetables = getGroupedBySemester()

  if (loading && timetables.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-[var(--color-bg-surface)] animate-pulse" />
        <TimetableListSkeleton cards={6} />
      </div>
    )
  }

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
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <span className="text-sm tabular-nums [color:var(--color-text-muted)]">
          {!loading && counts.total > 0 ? `${counts.total.toLocaleString()} timetable${counts.total === 1 ? '' : 's'}` : ''}
        </span>
        <Link href="/admin/timetables/new" className="btn-primary shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="hidden sm:inline">Generate Timetable</span>
          <span className="sm:hidden">Generate</span>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {([
          { id: 'all',            label: 'All',            count: counts.total },
          { id: 'approved',       label: 'Approved',       count: counts.approved },
          { id: 'pending_review', label: 'Pending Review', count: counts.pending_review },
          { id: 'draft',          label: 'Draft',          count: counts.draft },
          { id: 'rejected',       label: 'Rejected',       count: counts.rejected },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'bg-[#e8f0fe] [color:var(--color-primary,#1a73e8)]'
                : '[color:var(--color-text-secondary)] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2d2d]',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={[
                'text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                activeTab === tab.id
                  ? 'bg-[#1a73e8] text-white'
                  : 'bg-[#f1f3f4] dark:bg-[#2d2d2d] [color:var(--color-text-muted)]',
              ].join(' ')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active-jobs banner */}
      {runningJobs.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--color-success)' }}>
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
            <p className="card-description">AI engine is building your timetable</p>
          </div>
          <div className="space-y-3">
            {runningJobs.map(job => (
              <RunningJobRow
                key={job.job_id}
                job={job}
                onNavigate={() => router.push(`/admin/timetables/status/${job.job_id}`)}
                onJobFailed={(jobId) => {
                  setTerminatedJobIds(prev => new Set(prev).add(jobId))
                  loadTimetableData()
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timetables grid/list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold [color:var(--color-text-primary)]">Department Timetables</span>
          <div className="flex gap-1">
            {(['grid', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={[
                  'h-7 px-3 text-xs font-medium rounded-md border transition-colors capitalize',
                  viewMode === mode
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)] [color:var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-transparent [color:var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]',
                ].join(' ')}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {Object.keys(groupedTimetables).length === 0 ? (
          <div className="card text-center py-12">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 [color:var(--color-text-muted)]">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-sm font-semibold [color:var(--color-text-primary)] mb-1">No timetables yet</p>
            <p className="text-xs [color:var(--color-text-secondary)] mb-4">Generate your first timetable to get started.</p>
            <Link href="/admin/timetables/new" className="btn-primary">Generate Timetable</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTimetables)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([semesterKey, items]) => {
                const filteredItems = activeTab === 'all' ? items : items.filter(t => t.status === activeTab)
                if (filteredItems.length === 0) return null
                const [academicYear, semester] = semesterKey.split('-')
                return (
                  <div key={semesterKey} className="card">
                    <div className="card-header pb-3">
                      <div>
                        <h3 className="card-title">{academicYear} &middot; Semester {semester}</h3>
                        <p className="card-description">
                          {filteredItems.length} course{filteredItems.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp;
                          {filteredItems.filter(t => t.status === 'approved').length} approved
                        </p>
                      </div>
                    </div>

                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredItems
                          .sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
                          .map(t => {
                            const isRunning = runningJobs.some(j => j.job_id === t.id)
                            const href = isRunning ? `/admin/timetables/status/${t.id}` : `/admin/timetables/${t.id}/review`
                            return (
                              <Link
                                key={t.id}
                                href={href}
                                className="block p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-page)] no-underline transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate [color:var(--color-text-primary)] m-0">{t.department}</p>
                                    <p className="text-xs [color:var(--color-text-secondary)] mt-0.5 m-0">{t.batch ?? 'All Students'}</p>
                                  </div>
                                  <StatusChip status={t.status} isRunning={isRunning} />
                                </div>
                                <div className="flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs [color:var(--color-text-muted)]">Updated</span>
                                    <span className="text-xs [color:var(--color-text-secondary)]">{t.lastUpdated}</span>
                                  </div>
                                  {t.score != null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs [color:var(--color-text-muted)]">Quality score</span>
                                      <span className="text-xs font-semibold [color:var(--color-success-text)]">{t.score}/10</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs [color:var(--color-text-muted)]">Conflicts</span>
                                    <span className={`text-xs font-semibold ${t.conflicts > 0 ? '[color:var(--color-danger-text)]' : '[color:var(--color-success-text)]'}`}>
                                      {t.conflicts}
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                      </div>
                    ) : (
                      <table className="table">
                        <thead className="table-header">
                          <tr>
                            <th className="table-header-cell">Department</th>
                            <th className="table-header-cell">Batch</th>
                            <th className="table-header-cell">Status</th>
                            <th className="table-header-cell">Score</th>
                            <th className="table-header-cell">Conflicts</th>
                            <th className="table-header-cell">Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems
                            .sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
                            .map(t => {
                              const isRunning = runningJobs.some(j => j.job_id === t.id)
                              const href = isRunning ? `/admin/timetables/status/${t.id}` : `/admin/timetables/${t.id}/review`
                              return (
                                <tr key={t.id} className="table-row cursor-pointer" onClick={() => router.push(href)}>
                                  <td className="table-cell font-medium">{t.department}</td>
                                  <td className="table-cell">{t.batch ?? 'All Students'}</td>
                                  <td className="table-cell"><StatusChip status={t.status} isRunning={isRunning} /></td>
                                  <td className="table-cell">
                                    {t.score != null ? (
                                      <span className="text-xs font-semibold [color:var(--color-success-text)]">{t.score}/10</span>
                                    ) : '\u2014'}
                                  </td>
                                  <td className="table-cell">
                                    <span className={`text-xs font-semibold ${t.conflicts > 0 ? '[color:var(--color-danger-text)]' : '[color:var(--color-success-text)]'}`}>
                                      {t.conflicts}
                                    </span>
                                  </td>
                                  <td className="table-cell text-xs [color:var(--color-text-muted)]">{t.lastUpdated}</td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="btn-secondary h-8 px-3 text-sm"
          >
            &larr; Prev
          </button>
          <span className="text-sm [color:var(--color-text-secondary)] px-1">
            Page {currentPage} of {Math.ceil(totalCount / 20)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= Math.ceil(totalCount / 20) || loading}
            className="btn-secondary h-8 px-3 text-sm"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
