interface SystemMonitorGridProps {
  isLoading: boolean
  onDataAction: (action: string) => void
}

export default function SystemMonitorGrid({ isLoading, onDataAction }: SystemMonitorGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

      {/* System Health Monitor */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Health Monitor</h3>
          <p className="card-description">Real-time service status</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Django API</span>
            </div>
            <span className="badge badge-success">Online</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>FastAPI AI Service</span>
            </div>
            <span className="badge badge-success">Online</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Database Connection</span>
            </div>
            <span className="badge badge-success">Healthy</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Data Management</h3>
          <p className="card-description">Import/Export operations</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => onDataAction('import')} disabled={isLoading} className="btn-secondary text-left p-3 disabled:opacity-50">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4 4V4" />
              </svg>
              <span className="text-sm font-medium">Import CSV</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Bulk upload data</p>
          </button>
          <button onClick={() => onDataAction('export')} disabled={isLoading} className="btn-secondary text-left p-3 disabled:opacity-50">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 12m4-4v12" />
              </svg>
              <span className="text-sm font-medium">Export PDF</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Generate reports</p>
          </button>
          <button onClick={() => onDataAction('backup')} disabled={isLoading} className="btn-secondary text-left p-3 disabled:opacity-50">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span className="text-sm font-medium">Backup DB</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Create snapshot</p>
          </button>
          <button onClick={() => onDataAction('restore')} disabled={isLoading} className="btn-secondary text-left p-3 disabled:opacity-50">
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
  )
}
