'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { TimetableListSkeleton, Skeleton } from '@/components/LoadingSkeletons'
import PageHeader from '@/components/shared/PageHeader'
import type { TimetableListItem } from '@/types/timetable'
import { RunningJobRow } from './components/RunningJobRow'
import { StatusChip } from './components/StatusChip'
import type { RunningJob } from './components/RunningJobRow'
import { Calendar, LayoutGrid, List, Plus, Zap } from 'lucide-react'

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

  if (error) {
    return (
      <div className="card border-[var(--color-danger)]">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-danger-subtle)]">
              <svg width="16" height="16" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="card-title text-[var(--color-danger)]">Failed to load timetables</h3>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        <button onClick={loadTimetableData} className="btn-primary mt-4">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <PageHeader
        title="Timetables"
        count={counts.total}
        loading={loading}
        primaryAction={{
          label: 'Generate Timetable',
          icon: Plus,
          onClick: () => router.push('/admin/timetables/new'),
        }}
      />

      {/* Filter tabs — M3 pill navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
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
              'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150',
              activeTab === tab.id
                ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={[
                'text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums',
                activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-surface-2)] text-[var(--color-text-muted)]',
              ].join(' ')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active-jobs banner */}
      {runningJobs.length > 0 && activeTab === 'all' && (
        <div className="card border-l-[3px] border-l-[var(--color-primary)]">
          <div className="card-header pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[var(--color-primary)]" />
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
                onNavigate={() => router.push(`/admin/timetables/${job.job_id}/status`)}
                onJobFailed={(jobId) => {
                  setTerminatedJobIds(prev => new Set(prev).add(jobId))
                  loadTimetableData()
                }}
                onJobCompleted={(jobId) => {
                  setTerminatedJobIds(prev => new Set(prev).add(jobId))
                  loadTimetableData()
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timetables section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">Department Timetables</span>
          {/* M3 icon toggle — segmented button pattern */}
          <div className="flex items-center rounded-full border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-surface)]">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={[
                'h-8 w-9 flex items-center justify-center transition-colors duration-150',
                viewMode === 'grid'
                  ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]',
              ].join(' ')}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={[
                'h-8 w-9 flex items-center justify-center transition-colors duration-150',
                viewMode === 'list'
                  ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]',
              ].join(' ')}
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {loading && timetables.length === 0 ? (
          <TimetableListSkeleton cards={6} />
        ) : Object.keys(groupedTimetables).length === 0 ? (
          <div className="card text-center py-16">
            <Calendar size={40} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-50" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">No timetables yet</p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">Generate your first timetable to get started.</p>
            <Link href="/admin/timetables/new" className="btn-primary">
              <Plus size={16} />
              Generate Timetable
            </Link>
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
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredItems
                          .sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
                          .map(t => {
                            const isRunning = runningJobs.some(j => j.job_id === t.id)
                            const href = isRunning ? `/admin/timetables/${t.id}/status` : `/admin/timetables/${t.id}/review`
                            return (
                              <Link
                                key={t.id}
                                href={href}
                                className="block p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] no-underline transition-colors duration-150 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] card-hover"
                              >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{t.department}</p>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t.batch ?? 'All Students'}</p>
                                  </div>
                                  <StatusChip status={t.status} isRunning={isRunning} />
                                </div>
                                <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--color-text-muted)]">Updated</span>
                                    <span className="text-xs text-[var(--color-text-secondary)]">{t.lastUpdated}</span>
                                  </div>
                                  {t.score != null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-[var(--color-text-muted)]">Quality score</span>
                                      <span className="text-xs font-semibold text-[var(--color-success-text)]">{t.score}/10</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--color-text-muted)]">Conflicts</span>
                                    <span className={`text-xs font-semibold ${t.conflicts > 0 ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-success-text)]'}`}>
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
                              const href = isRunning ? `/admin/timetables/${t.id}/status` : `/admin/timetables/${t.id}/review`
                              return (
                                <tr key={t.id} className="table-row cursor-pointer" onClick={() => router.push(href)}>
                                  <td className="table-cell font-medium">{t.department}</td>
                                  <td className="table-cell">{t.batch ?? 'All Students'}</td>
                                  <td className="table-cell"><StatusChip status={t.status} isRunning={isRunning} /></td>
                                  <td className="table-cell">
                                    {t.score != null ? (
                                      <span className="text-xs font-semibold text-[var(--color-success-text)]">{t.score}/10</span>
                                    ) : '—'}
                                  </td>
                                  <td className="table-cell">
                                    <span className={`text-xs font-semibold ${t.conflicts > 0 ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-success-text)]'}`}>
                                      {t.conflicts}
                                    </span>
                                  </td>
                                  <td className="table-cell text-xs text-[var(--color-text-muted)]">{t.lastUpdated}</td>
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
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="btn-secondary h-9 px-4 text-sm"
          >
            ← Prev
          </button>
          <span className="text-sm text-[var(--color-text-secondary)] px-2 tabular-nums">
            Page {currentPage} of {Math.ceil(totalCount / 20)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= Math.ceil(totalCount / 20) || loading}
            className="btn-secondary h-9 px-4 text-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
