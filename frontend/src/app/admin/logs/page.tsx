'use client'

import { Activity, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'

const LOGS = [
  {
    id: 1,
    timestamp: '2023-10-15 14:30:25',
    level: 'INFO',
    action: 'User Login',
    user: 'harsh.sharma@cadence.edu',
    details: 'Admin login successful',
  },
  {
    id: 2,
    timestamp: '2023-10-15 14:25:12',
    level: 'SUCCESS',
    action: 'Timetable Generated',
    user: 'system',
    details: 'CS Semester 5 timetable generated successfully',
  },
  {
    id: 3,
    timestamp: '2023-10-15 14:20:08',
    level: 'WARNING',
    action: 'Failed Login',
    user: 'unknown@cadence.edu',
    details: 'Invalid credentials attempt',
  },
  {
    id: 4,
    timestamp: '2023-10-15 14:15:45',
    level: 'INFO',
    action: 'User Created',
    user: 'harsh.sharma@cadence.edu',
    details: 'New faculty member added: Dr. Rajesh Kumar',
  },
  {
    id: 5,
    timestamp: '2023-10-15 14:10:33',
    level: 'ERROR',
    action: 'System Error',
    user: 'system',
    details: 'Database connection timeout',
  },
]

function levelBadgeClass(level: string) {
  if (level === 'SUCCESS') return 'badge-success'
  if (level === 'WARNING') return 'badge-warning'
  if (level === 'ERROR')   return 'badge-danger'
  return 'badge-info'
}

export default function LogsPage() {
  const totalLogs    = LOGS.length
  const errorCount   = LOGS.filter(l => l.level === 'ERROR').length
  const warningCount = LOGS.filter(l => l.level === 'WARNING').length
  const successCount = LOGS.filter(l => l.level === 'SUCCESS').length

  return (
    <div className="space-y-4 sm:space-y-6">

      <PageHeader
        title="Logs"
        secondaryActions={
          <div className="flex items-center gap-2">
            <label htmlFor="level-filter" className="sr-only">Filter by log level</label>
            <select id="level-filter" className="input-primary w-32 text-sm">
              <option>All Levels</option>
              <option>INFO</option>
              <option>SUCCESS</option>
              <option>WARNING</option>
              <option>ERROR</option>
            </select>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 12m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Logs</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                {totalLogs}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-primary-subtle)' }}>
              <Activity className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Errors</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-danger)' }}>
                {errorCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-danger-subtle)' }}>
              <AlertOctagon className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Warnings</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-warning-text)' }}>
                {warningCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-warning-subtle)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning-text)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Successes</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-success-text)' }}>
                {successCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-success-subtle)' }}>
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success-text)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Log entries card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-description">
            {totalLogs} log entr{totalLogs !== 1 ? 'ies' : 'y'} recorded
          </p>
        </div>

        {/* Search row */}
        <div className="px-1 pb-4">
          <div className="relative">
            <label htmlFor="log-search" className="sr-only">Search logs</label>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
            </span>
            <input id="log-search" placeholder="Search logs..." className="input-search" />
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {LOGS.map(log => (
            <div key={log.id} className="interactive-element p-4 rounded-lg border"
              style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {log.action}
                  </h4>
                  <p className="text-sm truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {log.details}
                  </p>
                </div>
                <span className={`badge ml-2 ${levelBadgeClass(log.level)}`}>{log.level}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2"
                style={{ color: 'var(--color-text-muted)' }}>
                <span>{log.timestamp}</span>
                <span>{log.user}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Timestamp</th>
                <th className="table-header-cell">Level</th>
                <th className="table-header-cell">Action</th>
                <th className="table-header-cell hidden lg:table-cell">User</th>
                <th className="table-header-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {LOGS.map(log => (
                <tr key={log.id} className="table-row">
                  <td className="table-cell text-xs">{log.timestamp}</td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${levelBadgeClass(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="table-cell font-medium">{log.action}</td>
                  <td className="table-cell hidden lg:table-cell text-sm">{log.user}</td>
                  <td className="table-cell text-sm">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

