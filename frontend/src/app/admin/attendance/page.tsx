'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/Pagination'
import { useToast } from '@/components/Toast'

interface OverviewStats {
  total_sessions: number
  sessions_marked: number
  sessions_pending: number
  overall_attendance_percentage: number
  at_risk_students_count: number
  department_stats: DepartmentStat[]
}

interface DepartmentStat {
  department_name: string
  total_sessions: number
  sessions_marked: number
  average_attendance: number
  at_risk_students: number
}

interface AuditLog {
  id: number
  record_id: number
  session_details: string
  student_details: string
  action: string
  old_status: string | null
  new_status: string
  changed_by_name: string
  reason: string
  timestamp: string
  ip_address: string
}

interface AttendanceAlert {
  id: number
  alert_type: string
  severity: string
  message: string
  student_name?: string
  faculty_name?: string
  created_at: string
  is_read: boolean
}

interface AttendanceRecord {
  id: number
  student_name: string
  subject_name: string
  date: string
  status: string
}

export default function AdminAttendancePage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [overrideData, setOverrideData] = useState({ new_status: '', reason: '' })
  const { showSuccessToast, showErrorToast } = useToast()

  useEffect(() => {
    loadOverview()
    loadAlerts()
  }, [])

  useEffect(() => {
    loadAuditLogs()
  }, [currentPage])

  const loadOverview = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/attendance/admin/overview/', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to load overview')
      
      const data = await response.json()
      setOverview(data)
    } catch (error) {
      console.error('Failed to load overview:', error)
      showErrorToast('Failed to load overview')
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/attendance/admin/audit-logs/?page=${currentPage}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to load audit logs')
      
      const data = await response.json()
      setAuditLogs(data.results || [])
      setTotalCount(data.count || 0)
      setTotalPages(Math.ceil((data.count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      showErrorToast('Failed to load audit logs')
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/attendance/alerts/?page_size=20', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAlerts(data.results || [])
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }

  const handleOverride = async () => {
    if (!selectedRecord || !overrideData.new_status || !overrideData.reason) {
      showErrorToast('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/attendance/admin/override/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          record_id: selectedRecord.id,
          new_status: overrideData.new_status,
          reason: overrideData.reason
        })
      })

      if (!response.ok) throw new Error('Failed to override attendance')

      showSuccessToast('Attendance record overridden successfully')
      setShowOverrideModal(false)
      setSelectedRecord(null)
      setOverrideData({ new_status: '', reason: '' })
      loadAuditLogs()
      loadOverview()
    } catch (error) {
      console.error('Failed to override attendance:', error)
      showErrorToast('Failed to override attendance')
    }
  }

  const acknowledgeAlert = async (alertId: number) => {
    try {
      await fetch(`http://localhost:8000/api/attendance/alerts/${alertId}/acknowledge/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      setAlerts(alerts.filter(a => a.id !== alertId))
      showSuccessToast('Alert acknowledged')
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'override':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No attendance data available</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monitor and manage university-wide attendance</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <button
            onClick={() => window.open('http://localhost:8000/api/attendance/admin/generate-report/?type=daily', '_blank')}
            className="btn-primary"
          >
            📊 Generate Report
          </button>
        </div>

        {/* Overview Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="card text-center border-2 border-blue-200 dark:border-blue-800">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {overview.total_sessions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Sessions</div>
          </div>
          <div className="card text-center border-2 border-green-200 dark:border-green-800">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {overview.sessions_marked}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Marked</div>
          </div>
          <div className="card text-center border-2 border-red-200 dark:border-red-800">
            <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {overview.sessions_pending}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending</div>
          </div>
          <div className="card text-center border-2 border-purple-200 dark:border-purple-800">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Math.round(overview.overall_attendance_percentage)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall</div>
          </div>
          <div className="card text-center border-2 border-orange-200 dark:border-orange-800">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
              {overview.at_risk_students_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">At Risk</div>
          </div>
        </div>

        {/* Department Statistics */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Department-wise Statistics</h3>
            <p className="card-description">Attendance breakdown by department</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Department
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Total Sessions
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Marked
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Avg Attendance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    At Risk
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {overview?.department_stats?.map(dept => (
                  <tr key={dept.department_name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {dept.department_name}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                      {dept.total_sessions}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">
                      {dept.sessions_marked}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${
                        dept.average_attendance >= 85 ? 'text-green-600 dark:text-green-400' :
                        dept.average_attendance >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {Math.round(dept.average_attendance)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">
                      {dept.at_risk_students}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Active Alerts ({alerts.length})</h3>
              <p className="card-description">Recent attendance alerts</p>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold uppercase">
                          {alert.alert_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white dark:bg-gray-800">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      {(alert.student_name || alert.faculty_name) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {alert.student_name || alert.faculty_name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Audit Trail</h3>
            <p className="card-description">Recent attendance changes and actions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Session
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Changed By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.session_details}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.student_details}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.old_status && (
                        <span className="text-gray-500">{log.old_status} → </span>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {log.new_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.changed_by_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="card-header">
              <h3 className="card-title">Override Attendance</h3>
              <button
                onClick={() => {
                  setShowOverrideModal(false)
                  setSelectedRecord(null)
                  setOverrideData({ new_status: '', reason: '' })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Status: <span className="font-bold">{selectedRecord.status}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Status
                </label>
                <select
                  value={overrideData.new_status}
                  onChange={(e) => setOverrideData({ ...overrideData, new_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  aria-label="Select new attendance status"
                >

                  <option value="">Select status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Required)
                </label>
                <textarea
                  value={overrideData.reason}
                  onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="Explain why you are overriding this record..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowOverrideModal(false)
                    setSelectedRecord(null)
                    setOverrideData({ new_status: '', reason: '' })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverride}
                  className="btn-primary"
                >
                  Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
