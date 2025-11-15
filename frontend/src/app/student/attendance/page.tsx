'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'

interface AttendanceRecord {
  date: string
  time_slot: string
  status: string
  classroom: string
}

interface CourseAttendance {
  course_id: number
  total_classes: number
  present_classes: number
  percentage: number
  records: AttendanceRecord[]
}

export default function StudentAttendancePage() {
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: CourseAttendance }>({})
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  useEffect(() => {
    loadAttendanceData()
  }, [])

  const loadAttendanceData = async () => {
    try {
      // Mock student ID - replace with actual logged-in student ID
      const studentId = 1
      const response = await fetch(`http://localhost:8000/api/v1/attendance/student/${studentId}/`)
      const data = await response.json()
      setAttendanceData(data)
    } catch (error) {
      console.error('Failed to load attendance data:', error)
    } finally {
      setLoading(false)
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
      default:
        return '❓'
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

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Object.entries(attendanceData).map(([courseName, courseData]) => (
            <div
              key={courseName}
              onClick={() => setSelectedCourse(selectedCourse === courseName ? null : courseName)}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${getPercentageBg(courseData.percentage)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{courseName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {courseData.present_classes}/{courseData.total_classes} classes attended
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getPercentageColor(courseData.percentage)}`}>
                  {courseData.percentage}%
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Classes:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {courseData.total_classes}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Present:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {courseData.present_classes}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Absent:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {courseData.total_classes - courseData.present_classes}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  👁️ {selectedCourse === courseName ? 'Hide Details' : 'View Details'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Records */}
        {selectedCourse && attendanceData[selectedCourse] && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{selectedCourse} - Detailed Records</h3>
              <p className="card-description">Complete attendance history for this subject</p>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Date</th>
                    <th className="table-header-cell">Time Slot</th>
                    <th className="table-header-cell">Classroom</th>
                    <th className="table-header-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData[selectedCourse].records
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((record, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell font-medium">{record.date}</td>
                        <td className="table-cell">{record.time_slot}</td>
                        <td className="table-cell">{record.classroom}</td>
                        <td className="table-cell">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : record.status === 'late'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {getStatusIcon(record.status)}{' '}
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {Object.keys(attendanceData).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Subjects</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {Object.values(attendanceData).reduce(
                (sum, course) => sum + course.present_classes,
                0
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Present</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {Object.values(attendanceData).reduce(
                (sum, course) => sum + (course.total_classes - course.present_classes),
                0
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Absent</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Object.values(attendanceData).length > 0
                ? Math.round(
                    Object.values(attendanceData).reduce(
                      (sum, course) => sum + course.percentage,
                      0
                    ) / Object.values(attendanceData).length
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
