'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { TimetableListSkeleton } from '@/components/LoadingSkeletons'
import type { TimetableListItem } from '@/types/timetable'

interface RunningJob {
  job_id: string
  progress: number
  status: string
  message: string
  time_remaining_seconds?: number | null
}

const CACHE_KEY = 'admin_timetables_cache'
const CACHE_TTL_MS = 60_000 // 60 s stale-while-revalidate window

function transformJobs(jobs: any[]): TimetableListItem[] {
  return jobs.map((job: any) => ({
    id: job.job_id || job.id,
    department: job.organization_name || 'All Departments',
    batch: job.batch?.batch_name || null,
    semester: job.semester || 1,
    academic_year: job.academic_year || '2024-25',
    status: job.status || 'draft',
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

  const { user } = useAuth()
  const router = useRouter()
  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  // ── Derive running jobs from the main list (no extra API round-trip) ─────
  const runningJobs = useMemo<RunningJob[]>(
    () =>
      timetables
        .filter(t => t.status === 'running' || t.status === 'pending')
        .map(t => ({
          job_id: t.id,
          progress: 0,
          status: t.status,
          message: t.status === 'pending' ? 'Starting…' : 'Processing…',
          time_remaining_seconds: null,
        })),
    [timetables]
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
      setTimetables(listItems)

      // Background-prefetch variants for the 3 most-recent completed/failed jobs.
      // This warms the Redis cache so clicking any of those timetables is instant,
      // even if Redis has evicted the keys since the initial cache-warm on completion.
      const toPrewarm = listItems
        .filter((t: TimetableListItem) => t.status === 'completed' || t.status === 'failed')
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
      const hasActive = listItems.some(t => t.status === 'running' || t.status === 'pending')
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

    timetables.forEach(timetable => {
      const key = `${timetable.academic_year}-${timetable.semester}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(timetable)
    })

    return grouped
  }, [timetables])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-[#4CAF50] bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20'
      case 'pending':
        return 'text-[#FF9800] bg-[#FF9800]/10 dark:bg-[#FF9800]/20'
      case 'draft':
        return 'text-[#6B6B6B] dark:text-[#B3B3B3] bg-[#E0E0E0] dark:bg-[#404040]'
      case 'rejected':
        return 'text-[#F44336] bg-[#F44336]/10 dark:bg-[#F44336]/20'
      default:
        return 'text-[#6B6B6B] dark:text-[#B3B3B3] bg-[#E0E0E0] dark:bg-[#404040]'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅'
      case 'pending':
        return '⏳'
      case 'draft':
        return '📝'
      case 'rejected':
        return '❌'
      default:
        return '📄'
    }
  }

  const groupedTimetables = getGroupedBySemester()

  // Show skeleton only on the very first load (no stale data yet)
  if (loading && timetables.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <TimetableListSkeleton cards={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card border-[#F44336] bg-[#F44336]/5">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-[#F44336]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-[#F44336]">Error Loading Timetables</h3>
            </div>
          </div>
          <p className="text-sm text-[#2C2C2C] dark:text-[#FFFFFF]">{error}</p>
          <button onClick={loadTimetableData} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Running Jobs Banner - Show for any running/queued jobs */}
        {runningJobs.length > 0 && (
          <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="card-header">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">🔄 Generation in Progress</h3>
            </div>
            <div className="space-y-3">
              {runningJobs.map((job) => (
                <div key={job.job_id} className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {job.message}
                    </span>
                    <button
                      onClick={() => router.push(`/admin/timetables/status/${job.job_id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      View Details →
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{job.progress}%</span>
                      {job.time_remaining_seconds && job.time_remaining_seconds > 0 && (
                        <span>
                          {Math.floor(job.time_remaining_seconds / 60)}m {job.time_remaining_seconds % 60}s remaining
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden relative">
                      <div
                        className="h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                        style={{ 
                          width: `${job.progress}%`,
                          background: 'linear-gradient(90deg, #1976D2 0%, #2196F3 50%, #42A5F5 100%)'
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s linear infinite',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex flex-col sm:flex-row gap-3 ml-auto">
            <Link
              href="/admin/timetables/new"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.879-1.453l-.548-.547z"
                />
              </svg>
              <span className="hidden sm:inline">Generate New Timetable</span>
              <span className="sm:hidden">Generate</span>
            </Link>
          </div>
        </div>

        {/* Timetables */}
        <div className="space-y-6">

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Timetables</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Course-centric schedules for all semesters</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#2196F3] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#2196F3] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  List View
                </button>
              </div>
            </div>

            {/* Timetables by Semester */}
            <div className="space-y-4">
          {Object.keys(groupedTimetables).length === 0 ? (
            <div className="card">
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">📅</div>
                <h3 className="text-base sm:text-lg font-medium text-[#0f0f0f] dark:text-white mb-2">
                  No Timetables Found
                </h3>
                <p className="text-sm text-[#606060] dark:text-[#aaaaaa] mb-4 sm:mb-6 px-4">
                  No timetables have been created yet.
                </p>
                <Link href="/admin/timetables/new" className="btn-primary">
                  Create First Timetable
                </Link>
              </div>
            </div>
          ) : (
            Object.entries(groupedTimetables)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([semesterKey, semesterTimetables]) => {
                const [academicYear, semester] = semesterKey.split('-')
                return (
                  <div key={semesterKey} className="card">
                    <div className="card-header">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="card-title">
                            {academicYear} - Semester {semester}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {semesterTimetables.length} course{semesterTimetables.length !== 1 ? 's' : ''} scheduled
                          </p>
                        </div>
                        <span className="badge badge-info">
                          {semesterTimetables.filter(t => t.status === 'approved').length} approved
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                      {semesterTimetables
                        .sort((a, b) => (a.department || '').localeCompare(b.department || ''))
                        .map(timetable => {
                          // Check if this job is currently running
                          const isRunning = runningJobs.some(job => job.job_id === timetable.id)
                          const targetUrl = isRunning 
                            ? `/admin/timetables/status/${timetable.id}`
                            : `/admin/timetables/${timetable.id}/review`
                          
                          return (
                          <Link
                            key={timetable.id}
                            href={targetUrl}
                            className="block p-3 sm:p-4 bg-white dark:bg-[#1E1E1E] border border-[#E0E0E0] dark:border-[#2A2A2A] rounded-lg hover:border-[#2196F3] dark:hover:border-[#2196F3] transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-[#2C2C2C] dark:text-[#FFFFFF] truncate">
                                  {timetable.department}
                                </h4>
                                <p className="text-sm text-[#6B6B6B] dark:text-[#B3B3B3]">
                                  {timetable.batch || 'All Students'}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-medium flex-shrink-0 ml-2 rounded ${isRunning ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : getStatusColor(
                                  timetable.status
                                )}`}
                              >
                                {isRunning ? '🔄 Running' : `${getStatusIcon(timetable.status)} ${timetable.status.charAt(0).toUpperCase() + timetable.status.slice(1)}`}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#606060] dark:text-[#aaaaaa]">
                                  Last Updated:
                                </span>
                                <span className="text-[#0f0f0f] dark:text-white">
                                  {timetable.lastUpdated}
                                </span>
                              </div>

                              {timetable.score && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-[#606060] dark:text-[#aaaaaa]">Score:</span>
                                  <span className="font-medium text-[#00ba7c]">
                                    {timetable.score}/10
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#606060] dark:text-[#aaaaaa]">Conflicts:</span>
                                <span
                                  className={`font-medium ${
                                    timetable.conflicts > 0 ? 'text-[#ff4444]' : 'text-[#00ba7c]'
                                  }`}
                                >
                                  {timetable.conflicts}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-[#e5e5e5] dark:border-[#3d3d3d]">
                              <span className="text-xs text-[#065fd4] font-medium group-hover:text-[#0856c1] transition-colors duration-200">
                                {isRunning ? '⏱️ View Progress →' : '👁️ View Details →'}
                              </span>
                            </div>
                          </Link>
                        )})
                      }
                    </div>
                  </div>
                )
              })
          )}
            </div>
        </div>

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="btn-secondary px-4 py-2 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {Math.ceil(totalCount / 20)}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / 20) || loading}
              className="btn-secondary px-4 py-2 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#00ba7c]">
              {timetables.filter(t => t.status === 'approved').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">
              Approved
            </div>
          </div>
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#f9ab00]">
              {timetables.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">
              Pending
            </div>
          </div>
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#606060] dark:text-[#aaaaaa]">
              {timetables.filter(t => t.status === 'draft').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">Draft</div>
          </div>
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#ff4444]">
              {timetables.filter(t => t.status === 'rejected').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">
              Rejected
            </div>
          </div>
        </div>
      </div>
  )
}
