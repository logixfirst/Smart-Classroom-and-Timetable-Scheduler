'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import apiClient from '@/lib/api'
import AdminStatsGrid from './components/AdminStatsGrid'
import FacultyAvailabilityCard from './components/FacultyAvailabilityCard'
import SystemMonitorGrid from './components/SystemMonitorGrid'
import AuditAndConfigPanel from './components/AuditAndConfigPanel'
import StrategicActionsPanel from './components/StrategicActionsPanel'

const STATS_CACHE_KEY = 'admin_dashboard_stats'
const STATS_CACHE_TTL = 5 * 60 * 1000 // 5 min

interface DashboardStats {
  totalUsers: number
  activeCourses: number
  pendingApprovals: number
  systemHealth: number
}

interface FacultyMember {
  id: string
  name: string
  department: string | null
  isAvailable: boolean
  assigned_courses?: Array<{ id: string; code: string; name: string }> | null
}

const DEFAULT_STATS: DashboardStats = { totalUsers: 0, activeCourses: 0, pendingApprovals: 0, systemHealth: 98 }

function getCachedStats(): { data: DashboardStats; fresh: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STATS_CACHE_KEY)
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: DashboardStats; ts: number }
      return Date.now() - ts < STATS_CACHE_TTL ? { data, fresh: true } : { data, fresh: false }
    }
  } catch { /* storage unavailable */ }
  return null
}

export default function AdminDashboard() {
  const router = useRouter()
  const { showToast } = useToast()

  const _cached = getCachedStats()
  const [stats, setStats] = useState<DashboardStats>(_cached?.data ?? DEFAULT_STATS)
  const [loading, setLoading] = useState(!_cached) // skeleton only when no cache
  const [isLoading, setIsLoading] = useState(false)
  const [faculty, setFaculty] = useState<FacultyMember[]>([])
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    if (!getCachedStats()) setLoading(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20_000)
      let response
      try {
        response = await apiClient.request<{
          stats?: { total_users?: number; active_courses?: number; pending_approvals?: number; system_health?: number }
          faculty?: { id?: string; name?: string; department?: string | { dept_name?: string }; isAvailable?: boolean; assigned_courses?: Array<{ id: string; code: string; name: string }> }[]
        }>('/dashboard/stats/', { signal: controller.signal } as Parameters<typeof apiClient.request>[1])
      } finally {
        clearTimeout(timeoutId)
      }
      const data = response?.data

      if (data?.stats) {
        const freshStats: DashboardStats = {
          totalUsers: data.stats.total_users ?? 0,
          activeCourses: data.stats.active_courses ?? 0,
          pendingApprovals: data.stats.pending_approvals ?? 0,
          systemHealth: data.stats.system_health ?? 98,
        }
        setStats(freshStats)
        try { sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data: freshStats, ts: Date.now() })) } catch { /* quota */ }
      }

      if (data?.faculty) {
        setFaculty(
          data.faculty.map((f) => ({
            id: (f.id as string) || 'unknown',
            name: (f.name as string) || 'Unknown Faculty',
            department: typeof f.department === 'string' ? f.department : (f.department as { dept_name?: string })?.dept_name ?? null,
            isAvailable: f.isAvailable !== undefined ? (f.isAvailable as boolean) : true,
            assigned_courses: (f.assigned_courses as Array<{ id: string; code: string; name: string }>) || null,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStrategicAction = (action: string) => {
    switch (action) {
      case 'addUser': router.push('/admin/admins'); break
      case 'roles':   showToast('info', 'Role management coming soon'); break
      case 'audit':   router.push('/admin/logs'); break
      case 'config':  router.push('/admin/settings'); break
      case 'backup':  showToast('info', 'Database backup is under development'); break
      case 'reports': router.push('/admin/logs'); break
      default:        showToast('warning', 'Feature not implemented yet')
    }
  }

  const handleDataAction = (action: string) => {
    switch (action) {
      case 'import':  showToast('info', 'CSV import is under development'); break
      case 'export':  router.push('/admin/timetables'); break
      case 'backup':  showToast('info', 'Database backup is under development'); break
      case 'restore': setShowRestoreConfirm(true); break
      default:        showToast('warning', 'Action not implemented')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      <AdminStatsGrid
        stats={stats}
        loading={loading}
        onApprovalsClick={() => router.push('/admin/timetables')}
      />

      <FacultyAvailabilityCard faculty={faculty} loading={loading} />

      <SystemMonitorGrid isLoading={isLoading} onDataAction={handleDataAction} />

      <AuditAndConfigPanel />

      <StrategicActionsPanel isLoading={isLoading} onAction={handleStrategicAction} />

      {/* ── Restore Confirmation Dialog ─────────────────────────────────── */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.32)' }}>
          <div className="card max-w-sm w-full shadow-xl">
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Restore from backup?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              This will overwrite all current data with the latest backup. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRestoreConfirm(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { setShowRestoreConfirm(false); showToast('info', 'Database restore is under development') }}
                className="btn-primary"
                style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
