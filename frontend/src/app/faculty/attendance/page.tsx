'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { useToast } from '@/components/Toast'

interface Subject {
  subject_id: string
  subject_name: string
  total_sessions: number
  sessions_marked: number
  average_attendance: number
  at_risk_students: number
}

interface Student {
  student_id: string
  student_name: string
  attendance_percentage: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  at_risk: boolean
}

interface AttendanceSession {
  id: number
  subject_id: string
  subject_name: string
  batch_id: string
  date: string
  time_slot: string
  is_marked: boolean
  marked_at: string | null
  total_students: number
  present_count: number
}

export default function FacultyAttendancePage() {
  const [myClasses, setMyClasses] = useState<Subject[]>([])
  const [pendingSessions, setPendingSessions] = useState<AttendanceSession[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [classReport, setClassReport] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [markingMode, setMarkingMode] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [attendanceData, setAttendanceData] = useState<{[key: string]: string}>({})
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccessToast, showErrorToast } = useToast()

  useEffect(() => {
    loadMyClasses()
    loadPendingSessions()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      loadClassReport(selectedSubject)
    }
  }, [selectedSubject])

  const loadMyClasses = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:8000/api/attendance/faculty/my-classes/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to load classes')
      
      const data = await response.json()
      setMyClasses(data.results || [])
    } catch (error) {
      console.error('Failed to load classes:', error)
      showErrorToast('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:8000/api/attendance/sessions/pending/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingSessions(data.results || [])
      }
    } catch (error) {
      console.error('Failed to load pending sessions:', error)
    }
  }

  const loadClassReport = async (subjectId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`http://localhost:8000/api/attendance/faculty/class-report/${subjectId}/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to load class report')
      
      const data = await response.json()
      setClassReport(data.students || [])
    } catch (error) {
      console.error('Failed to load class report:', error)
      showErrorToast('Failed to load class report')
    }
  }

  const startMarkingAttendance = (session: AttendanceSession) => {
    setSelectedSession(session)
    setMarkingMode(true)
    // Initialize all students as present by default
    const initialData: {[key: string]: string} = {}
    classReport.forEach(student => {
      initialData[student.student_id] = 'present'
    })
    setAttendanceData(initialData)
  }

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }))
  }

  const submitAttendance = async () => {
    if (!selectedSession) return

    try {
      const token = localStorage.getItem('auth_token')
      const attendanceArray = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        status,
        remarks: ''
      }))

      const response = await fetch(`http://localhost:8000/api/attendance/sessions/${selectedSession.id}/mark-attendance/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attendance_data: attendanceArray })
      })

      if (!response.ok) throw new Error('Failed to mark attendance')

      showSuccessToast('Attendance marked successfully')
      setMarkingMode(false)
      setSelectedSession(null)
      loadMyClasses()
      loadPendingSessions()
    } catch (error) {
      console.error('Failed to mark attendance:', error)
      showErrorToast('Failed to mark attendance')
    }
  }

  const handleFileImport = async () => {
    if (!importFile || !selectedSession) return

    try {
      const token = localStorage.getItem('auth_token')
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch(`http://localhost:8000/api/attendance/sessions/${selectedSession.id}/import-attendance/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`
        },
        body: formData
      })

      if (!response.ok) throw new Error('Failed to import attendance')

      const result = await response.json()
      showSuccessToast(`Imported ${result.imported_count} records`)
      setImportFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      loadMyClasses()
      loadPendingSessions()
    } catch (error) {
      console.error('Failed to import attendance:', error)
      showErrorToast('Failed to import attendance')
    }
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600 dark:text-green-400'
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <DashboardLayout role="faculty">
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
    <DashboardLayout role="faculty">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Attendance Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Mark and track attendance for your classes
            </p>
          </div>
        </div>

        {/* Pending Sessions Alert */}
        {pendingSessions.length > 0 && (
          <div className="card border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  ⚠️ {pendingSessions.length} Pending Session{pendingSessions.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  You have unmarked attendance sessions that need attention
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My Classes Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {myClasses.map(subject => (
            <div
              key={subject.subject_id}
              onClick={() => setSelectedSubject(
                selectedSubject === subject.subject_id ? null : subject.subject_id
              )}
              className="card cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {subject.subject_name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {subject.subject_id}
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getPercentageColor(subject.average_attendance)}`}>
                  {Math.round(subject.average_attendance)}%
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Sessions:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {subject.total_sessions}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Marked:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {subject.sessions_marked}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {subject.total_sessions - subject.sessions_marked}
                  </span>
                </div>
                {subject.at_risk_students > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">At Risk:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {subject.at_risk_students} students
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                  Click to view class report
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Sessions List */}
        {pendingSessions.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Pending Sessions</h3>
              <p className="card-description">Mark attendance for these sessions</p>
            </div>
            <div className="space-y-3">
              {pendingSessions.map(session => (
                <div
                  key={session.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {session.subject_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(session.date).toLocaleDateString()} • {session.time_slot} • {session.batch_id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {session.total_students} students enrolled
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubject(session.subject_id)
                      setTimeout(() => startMarkingAttendance(session), 100)
                    }}
                    className="btn-primary"
                  >
                    📝 Mark Attendance
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Class Report */}
        {selectedSubject && !markingMode && (
          <div className="card">
            {(() => {
              const subject = myClasses.find(s => s.subject_id === selectedSubject)
              if (!subject) return null

              return (
                <>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Class Report - {subject.subject_name}</h3>
                      <p className="card-description">{subject.subject_id} • {classReport.length} students</p>
                    </div>
                    <button
                      onClick={() => setSelectedSubject(null)}
                      className="btn-secondary text-sm"
                    >
                      Close
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Student ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Attendance %
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Present
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Absent
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Late
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {classReport.map(student => (
                          <tr 
                            key={student.student_id} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${student.at_risk ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                          >
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {student.student_id}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {student.student_name}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-bold ${getPercentageColor(student.attendance_percentage)}`}>
                                {Math.round(student.attendance_percentage)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">
                              {student.present_count}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">
                              {student.absent_count}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-yellow-600 dark:text-yellow-400">
                              {student.late_count}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {student.at_risk && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                  ⚠️ At Risk
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Marking Attendance Form */}
        {markingMode && selectedSession && (
          <div className="card border-2 border-blue-500">
            <div className="card-header">
              <div>
                <h3 className="card-title">Mark Attendance - {selectedSession.subject_name}</h3>
                <p className="card-description">
                  {new Date(selectedSession.date).toLocaleDateString()} • {selectedSession.time_slot} • {selectedSession.batch_id}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMarkingMode(false)
                    setSelectedSession(null)
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Import Option */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                📁 Import from File
              </h4>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-600 dark:text-gray-400"
                  aria-label="Select attendance file to import"
                />
                <button
                  onClick={handleFileImport}
                  disabled={!importFile}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                CSV/Excel format: student_id, status (present/absent/late/excused)
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const newData: {[key: string]: string} = {}
                  classReport.forEach(s => { newData[s.student_id] = 'present' })
                  setAttendanceData(newData)
                }}
                className="btn-secondary text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  const newData: {[key: string]: string} = {}
                  classReport.forEach(s => { newData[s.student_id] = 'absent' })
                  setAttendanceData(newData)
                }}
                className="btn-secondary text-sm"
              >
                Mark All Absent
              </button>
            </div>

            {/* Student List */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Student
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Present
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Absent
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Late
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Excused
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {classReport.map(student => (
                    <tr key={student.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.student_name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {student.student_id}
                        </div>
                      </td>
                      {['present', 'absent', 'late', 'excused'].map(status => (
                        <td key={status} className="px-4 py-3 text-center">
                          <input
                            type="radio"
                            name={`attendance-${student.student_id}`}
                            checked={attendanceData[student.student_id] === status}
                            onChange={() => handleAttendanceChange(student.student_id, status)}
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                            aria-label={`Mark ${student.student_name} as ${status}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={submitAttendance}
                className="btn-primary"
              >
                ✅ Submit Attendance
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
