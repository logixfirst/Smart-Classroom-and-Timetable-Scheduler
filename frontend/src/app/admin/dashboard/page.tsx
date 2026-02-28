'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import apiClient from '@/lib/api'

export default function AdminDashboard() {
  const router = useRouter()
  const { showToast } = useToast()
  const STATS_CACHE_KEY = 'admin_dashboard_stats'
  const STATS_CACHE_TTL = 5 * 60 * 1000 // 5 min — matches backend TTL

  // Stale-while-revalidate: always show whatever we have cached;
  // hasStaleCache controls whether we show a subtle refresh indicator
  // instead of a full "..." loading placeholder.
  const getCachedStats = () => {
    try {
      const raw = sessionStorage.getItem(STATS_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < STATS_CACHE_TTL) return { data, fresh: true }
        return { data, fresh: false }  // expired but usable as stale
      }
    } catch { /* storage unavailable */ }
    return null
  }
  const _cached = getCachedStats()

  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState(
    _cached?.data ?? { totalUsers: 0, activeCourses: 0, pendingApprovals: 0, systemHealth: 98 }
  )
  // loading = true only when we have NO cached data (shows skeleton)
  // if we have stale data, we show it immediately and refresh silently
  const [loading, setLoading] = useState(!_cached)
  const [faculty, setFaculty] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    // Only show full loading spinner if we have no cached data at all
    if (!getCachedStats()) setLoading(true)
    try {
      // 20 s timeout — Render.com free-tier DB can be slow on cold start
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20_000)
      let response: any
      try {
        response = await apiClient.request('/dashboard/stats/', { signal: controller.signal } as any)
      } finally {
        clearTimeout(timeoutId)
      }
      const data = response.data as any

      if (data.stats) {
        const freshStats = {
          totalUsers: data.stats.total_users || 0,
          activeCourses: data.stats.active_courses || 0,
          pendingApprovals: data.stats.pending_approvals || 0,
          systemHealth: data.stats.system_health || 98,
        }
        setStats(freshStats)
        try {
          sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data: freshStats, ts: Date.now() }))
        } catch { /* quota exceeded */ }
      }

      if (data.faculty) {
        // Ensure faculty data is properly formatted
        const safeFaculty = data.faculty.map((f: any) => ({
          id: f.id || 'unknown',
          name: f.name || 'Unknown Faculty',
          department:
            typeof f.department === 'string' ? f.department : f.department?.dept_name || 'N/A',
          isAvailable: f.isAvailable !== undefined ? f.isAvailable : true,
        }))
        setFaculty(safeFaculty)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      // Do NOT reset stats to zeros — stale cached data is more useful than zeros
      // The user already sees the stale values; just stop the loading indicator.
    } finally {
      setLoading(false)
    }
  }

  const handleStrategicAction = async (action: string) => {
    setIsLoading(true)

    try {
      switch (action) {
        case 'addUser':
          router.push('/admin/users')
          break
        case 'roles':
          showToast('info', 'Role management feature coming soon')
          break
        case 'audit':
          router.push('/admin/logs')
          break
        case 'config':
          router.push('/admin/settings')
          break
        case 'backup':
          await simulateBackup()
          break
        case 'reports':
          await generateReports()
          break
        default:
          showToast('warning', 'Feature not implemented yet')
      }
    } catch (error) {
      showToast('error', 'Action failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const simulateBackup = async () => {
    showToast('info', 'Starting database backup...')

    // Simulate backup process
    await new Promise(resolve => setTimeout(resolve, 2000))

    showToast('success', 'Database backup completed successfully!')
  }

  const generateReports = async () => {
    showToast('info', 'Generating system reports...')

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 1500))

    showToast('success', 'Reports generated and ready for download!')
  }

  const handleDataAction = async (action: string) => {
    setIsLoading(true)

    try {
      switch (action) {
        case 'import':
          await simulateImport()
          break
        case 'export':
          await simulateExport()
          break
        case 'backup':
          await simulateBackup()
          break
        case 'restore':
          await simulateRestore()
          break
        default:
          showToast('warning', 'Action not implemented')
      }
    } catch (error) {
      showToast('error', 'Data operation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const simulateImport = async () => {
    showToast('info', 'Processing CSV import...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    showToast('success', 'CSV data imported successfully!')
  }

  const simulateExport = async () => {
    showToast('info', 'Generating PDF export...')
    await new Promise(resolve => setTimeout(resolve, 1500))
    showToast('success', 'PDF exported successfully!')
  }

  const simulateRestore = async () => {
    if (
      !confirm('Are you sure you want to restore from backup? This will overwrite current data.')
    ) {
      setIsLoading(false)
      return
    }
    showToast('info', 'Restoring from backup...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    showToast('success', 'Database restored successfully!')
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Overview of your institution’s academic operations.
        </p>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Total Users */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total Users</p>
              {loading
                ? <div className="loading-skeleton h-8 w-24 rounded-md mt-1" />
                : <p className="text-2xl lg:text-3xl font-semibold truncate mt-1" style={{ color: 'var(--color-text-primary)' }}>{stats.totalUsers.toLocaleString()}</p>
              }
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-primary)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium" style={{ color: 'var(--color-success-text)' }}>↗ 12%</span>
            <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>vs last month</span>
          </div>
        </div>

        {/* Active Courses */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Active Courses</p>
              {loading
                ? <div className="loading-skeleton h-8 w-20 rounded-md mt-1" />
                : <p className="text-2xl lg:text-3xl font-semibold truncate mt-1" style={{ color: 'var(--color-text-primary)' }}>{stats.activeCourses.toLocaleString()}</p>
              }
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-success)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium" style={{ color: 'var(--color-success-text)' }}>↗ 8%</span>
            <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>vs last month</span>
          </div>
        </div>

        {/* Pending Approvals */
        <div
          className="card clickable-card"
          onClick={() => router.push('/admin/approvals')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Pending Approvals</p>
              {loading
                ? <div className="loading-skeleton h-8 w-16 rounded-md mt-1" />
                : <p className="text-2xl lg:text-3xl font-semibold truncate mt-1" style={{ color: 'var(--color-text-primary)' }}>{stats.pendingApprovals.toLocaleString()}</p>
              }
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-warning)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="badge badge-warning">Needs attention</span>
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>System Health</p>
              {loading
                ? <div className="loading-skeleton h-8 w-16 rounded-md mt-1" />
                : <p className="text-2xl lg:text-3xl font-semibold truncate mt-1" style={{ color: 'var(--color-text-primary)' }}>{stats.systemHealth}%</p>
              }
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-success)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium" style={{ color: 'var(--color-success-text)' }}>All services online</span>
          </div>
        </div>

      </div>

      {/* Faculty Availability Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Faculty Availability - Today</h3>
          <p className="card-description">
            Mark faculty as available/unavailable for quick substitutions
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            <div className="col-span-full text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Loading faculty...</div>
          ) : faculty.length === 0 ? (
            <div className="col-span-full text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
              No faculty data available
            </div>
          ) : (
            faculty.map((faculty: any) => (
              <div
                key={faculty.id}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ background: 'var(--color-bg-surface-2)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {faculty.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {faculty.department || 'N/A'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked={faculty.isAvailable}
                    onChange={e => {
                      // Simple console log for demo purposes
                      console.log(`Faculty ${faculty.id} availability:`, e.target.checked)
                    }}
                  />
                  <div className="w-9 h-5 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" style={{ background: 'var(--color-bg-surface-3)' }}></div>
                  <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {faculty.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Health & Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Health Monitor</h3>
            <p className="card-description">Real-time service status</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Django API
                </span>
              </div>
              <span className="badge badge-success">Online</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  FastAPI AI Service
                </span>
              </div>
              <span className="badge badge-success">Online</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Database Connection
                </span>
              </div>
              <span className="badge badge-success">Healthy</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Data Management</h3>
            <p className="card-description">Import/Export operations</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleDataAction('import')}
              disabled={isLoading}
              className="btn-secondary text-left p-3 disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4 4V4" />
                </svg>
                <span className="text-sm font-medium">Import CSV</span>
              </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Bulk upload data</p>
            </button>
            <button
              onClick={() => handleDataAction('export')}
              disabled={isLoading}
              className="btn-secondary text-left p-3 disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 12m4-4v12" />
                </svg>
                <span className="text-sm font-medium">Export PDF</span>
              </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Generate reports</p>
            </button>
            <button
              onClick={() => handleDataAction('backup')}
              disabled={isLoading}
              className="btn-secondary text-left p-3 disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-sm font-medium">Backup DB</span>
              </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Create snapshot</p>
            </button>
            <button
              onClick={() => handleDataAction('restore')}
              disabled={isLoading}
              className="btn-secondary text-left p-3 disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Restore</span>
              </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>From backup</p>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Trail & Role Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Audit Trail</h3>
            <p className="card-description">Critical system actions</p>
          </div>
          <div className="space-y-3">
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Timetable Approved
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  priya.patel@cadence.edu
                </p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                2 min ago
              </span>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  User Role Changed
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  harsh.sharma@cadence.edu
                </p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                15 min ago
              </span>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Course Updated
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  rajesh.kumar@cadence.edu
                </p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>1h ago</span>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Login Failed</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>unknown</p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>2h ago</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Role Management</h3>
            <p className="card-description">Permission control</p>
          </div>
          <div className="space-y-3">
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Admin</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>All Access</p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>-</span>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Faculty</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Schedule View</p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>-</span>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>HOD</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Dept. Management</p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>-</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Configuration & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Configuration</h3>
            <p className="card-description">Global settings</p>
          </div>
          <div className="space-y-3">
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Academic Year</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>2024-25</p>
              </div>
              <button className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>Edit</button>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Semester Dates</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Jul 1 – Dec 15</p>
              </div>
              <button className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>Edit</button>
            </div>
            <div className="interactive-element flex items-center justify-between p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Holiday List</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>15 holidays configured</p>
              </div>
              <button className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>Edit</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Utilization Reports</h3>
            <p className="card-description">Resource usage analytics</p>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Classroom Usage</span>
                <span className="font-semibold" style={{ color: 'var(--color-success-text)' }}>87%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                <div className="h-2 rounded-full transition-all duration-500 w-[87%]" style={{ background: 'var(--color-success)' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Faculty Load</span>
                <span className="font-semibold" style={{ color: 'var(--color-warning-text)' }}>73%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                <div className="h-2 rounded-full transition-all duration-500 w-[73%]" style={{ background: 'var(--color-warning)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Conflict Detection</h3>
            <p className="card-description">AI-powered conflict analysis</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-danger-subtle)', borderColor: 'var(--color-danger)' }}>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                3 Schedule conflicts
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-warning-subtle)', borderColor: 'var(--color-warning)' }}>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                5 Room overlaps
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                12 Resolved today
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Notifications */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Notifications</h3>
          <p className="card-description">Alerts and announcements</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border-l-4 rounded-lg" style={{ background: 'var(--color-warning-subtle)', borderLeftColor: 'var(--color-warning)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              AI Engine Update
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Optimization algorithm improved by 15%
            </p>
          </div>
          <div className="p-4 border-l-4 rounded-lg" style={{ background: 'var(--color-info-subtle)', borderLeftColor: 'var(--color-primary)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              New Faculty Added
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              3 new faculty members registered
            </p>
          </div>
          <div className="p-4 border-l-4 rounded-lg" style={{ background: 'var(--color-success-subtle)', borderLeftColor: 'var(--color-success)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Backup Complete
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Daily system backup successful
            </p>
          </div>
        </div>
      </div>

      {/* Strategic Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Strategic Actions</h3>
          <p className="card-description">Administrative control center</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => handleStrategicAction('addUser')}
            disabled={isLoading}
            className="btn-primary flex flex-col items-center gap-2 py-4 px-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-xs font-medium">Add User</span>
          </button>
          <button
            onClick={() => handleStrategicAction('roles')}
            disabled={isLoading}
            className="btn-secondary flex flex-col items-center gap-2 py-4 px-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-medium">Roles</span>
          </button>
          <button
            onClick={() => handleStrategicAction('audit')}
            disabled={isLoading}
            className="btn-secondary flex flex-col items-center gap-2 py-4 px-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">Audit</span>
          </button>
          <button
            onClick={() => handleStrategicAction('config')}
            disabled={isLoading}
            className="btn-secondary flex flex-col items-center gap-2 py-4 px-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">Config</span>
          </button>
          <button
            onClick={() => handleStrategicAction('backup')}
            disabled={isLoading}
            className="btn-secondary flex flex-col items-center gap-2 py-4 px-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="text-xs font-medium">{isLoading ? 'Working…' : 'Backup'}</span>
          </button>
          <button
            onClick={() => handleStrategicAction('reports')}
            disabled={isLoading}
            className="btn-secondary flex flex-col items-center gap-2 py-4 px-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">{isLoading ? 'Working…' : 'Reports'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
