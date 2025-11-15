'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { useToast } from '@/components/Toast'

interface AttendanceRecord {
  id: number
  session_id: number
  date: string
  subject_name: string
  status: 'present' | 'absent' | 'late' | 'excused'
  marked_by_name: string
  marked_at: string
  remarks?: string
}

interface SubjectAttendance {
  subject_id: string
  subject_name: string
  total_sessions: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  attendance_percentage: number
  at_risk: boolean
  recent_records: AttendanceRecord[]
}

interface AttendanceSummary {
  overall_percentage: number
  at_risk: boolean
  total_sessions: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  subject_wise_attendance: SubjectAttendance[]
}

interface AttendanceAlert {
  id: number
  alert_type: string
  severity: string
  message: string
  created_at: string
  is_read: boolean
}

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { showSuccessToast, showErrorToast } = useToast()

  useEffect(() => {
    loadAttendanceData()
    loadAlerts()
  }, [])

  const loadAttendanceData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:8000/api/attendance/students/my-attendance/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load attendance data')
      }

      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Failed to load attendance data:', error)
      showErrorToast('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:8000/api/attendance/alerts/unread/', {
        headers: {
          'Authorization': `Token ${token}`,
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

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`http://localhost:8000/api/attendance/alerts/${alertId}/acknowledge/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      setAlerts(alerts.filter(a => a.id !== alertId))
      showSuccessToast('Alert dismissed')
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600 dark:text-green-400'
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getPercentageBg = (percentage: number) => {
    if (percentage >= 85)
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (percentage >= 75)
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return '✅'
      case 'absent':
        return '❌'
      case 'late':
        return '⏰'
      case 'excused':
        return '📝'
      default:
        return '❓'
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
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading attendance data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!summary) {
    return (
      <DashboardLayout role="student">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No attendance data available</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              My Attendance
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track your attendance across all subjects
            </p>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`card border-l-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold uppercase">{alert.alert_type.replace('_', ' ')}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white dark:bg-gray-800">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
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
        )}

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className={`card text-center border-2 ${getPercentageBg(summary.overall_percentage)}`}>
            <div className={`text-2xl sm:text-3xl font-bold ${getPercentageColor(summary.overall_percentage)}`}>
              {Math.round(summary.overall_percentage)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall</div>
            {summary.at_risk && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">⚠️ At Risk</div>
            )}
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {summary.total_sessions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Sessions</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {summary.present_count + summary.late_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Present</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {summary.absent_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Absent</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {summary.excused_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Excused</div>
          </div>
        </div>

        {/* Subject-wise Attendance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {summary.subject_wise_attendance.map(subject => (
            <div
              key={subject.subject_id}
              onClick={() => setSelectedSubject(
                selectedSubject === subject.subject_id ? null : subject.subject_id
              )}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${getPercentageBg(subject.attendance_percentage)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {subject.subject_name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {subject.subject_id}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {subject.present_count + subject.late_count}/{subject.total_sessions} sessions
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getPercentageColor(subject.attendance_percentage)}`}>
                  {Math.round(subject.attendance_percentage)}%
                </div>
              </div>

              {subject.at_risk && (
                <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-300">
                  ⚠️ Below minimum attendance threshold
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Present:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {subject.present_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Late:</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    {subject.late_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Absent:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {subject.absent_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Excused:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {subject.excused_count}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                  Click to view detailed records
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Records Table */}
        {selectedSubject && (
          <div className="card">
            {(() => {
              const subject = summary.subject_wise_attendance.find(s => s.subject_id === selectedSubject)
              if (!subject) return null

              return (
                <>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Attendance Records - {subject.subject_name}</h3>
                      <p className="card-description">{subject.subject_id}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSubject(null)
                      }}
                      className="btn-secondary text-sm"
                    >
                      Close
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Marked By
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {subject.recent_records.length > 0 ? (
                          subject.recent_records.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.status === 'present'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                      : record.status === 'late'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        : record.status === 'excused'
                                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  }`}
                                >
                                  {getStatusIcon(record.status)}{' '}
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {record.marked_by_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {record.remarks || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                              No attendance records available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
