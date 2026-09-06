'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import apiClient from '@/lib/api'

function levelBadgeClass(level: string) {
  if (level === 'SUCCESS') return 'badge-success'
  if (level === 'WARNING') return 'badge-warning'
  if (level === 'ERROR')   return 'badge-danger'
  return 'badge-info'
}

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ limit: 100, offset: 0, total: 0, has_more: false })
  const [statistics, setStatistics] = useState({ total_logs: 0, errors: 0, warnings: 0, successes: 0 })
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [statusFilter, pagination.offset])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      })

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const res = await apiClient.request(`/logs/audit/?${params}`)

      if (res.data && res.data.success) {
        setLogs(res.data.data || [])
        setPagination(res.data.pagination)
        setStatistics(res.data.statistics)
      } else {
        setError(res.data?.error || 'Failed to fetch logs')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    setPagination(prev => ({ ...prev, offset: 0 }))
  }

  const handleNextPage = () => {
    if (pagination.has_more) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))
    }
  }

  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      <PageHeader
        title="Logs"
        secondaryActions={
          <div className="flex items-center gap-2">
            <label htmlFor="level-filter" className="sr-only">Filter by status</label>
            <select
              id="level-filter"
              className="input-primary w-32 text-sm"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
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
                {statistics.total_logs}
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
                {statistics.errors}
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
                {statistics.warnings}
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
                {statistics.successes}
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
            {pagination.total} log entr{pagination.total !== 1 ? 'ies' : 'y'} recorded
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

        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            Loading logs...
          </div>
        ) : error ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-danger)' }}>
            <p>{error}</p>
            <button onClick={fetchLogs} className="btn-primary mt-3 text-sm">
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No logs found
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {logs.map((log, idx) => (
                <div key={idx} className="interactive-element p-4 rounded-lg border"
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
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
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
                  {logs.map((log, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell text-xs">{new Date(log.timestamp).toLocaleString()}</td>
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

            {/* Pagination */}
            <div className="flex items-center justify-between px-1 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.offset === 0}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.has_more}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
