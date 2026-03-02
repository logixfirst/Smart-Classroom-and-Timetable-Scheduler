interface DashboardStats {
  totalUsers: number
  activeCourses: number
  pendingApprovals: number
  systemHealth: number
}

interface AdminStatsGridProps {
  stats: DashboardStats
  loading: boolean
  onApprovalsClick: () => void
}

export default function AdminStatsGrid({ stats, loading, onApprovalsClick }: AdminStatsGridProps) {
  return (
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
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-primary-subtle)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
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
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-success-subtle)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--color-success-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card clickable-card" onClick={onApprovalsClick}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Pending Approvals</p>
            {loading
              ? <div className="loading-skeleton h-8 w-16 rounded-md mt-1" />
              : <p className="text-2xl lg:text-3xl font-semibold truncate mt-1" style={{ color: 'var(--color-text-primary)' }}>{stats.pendingApprovals.toLocaleString()}</p>
            }
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-warning-subtle)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--color-warning-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: 'var(--color-success-subtle)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--color-success-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="font-medium" style={{ color: 'var(--color-success-text)' }}>All services online</span>
        </div>
      </div>

    </div>
  )
}
