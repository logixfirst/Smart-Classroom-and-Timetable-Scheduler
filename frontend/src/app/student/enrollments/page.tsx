'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'

interface Course {
  offering_id: string
  enrollment_id: string
  course_code: string
  course_name: string
  credits: number
  department: string
  faculty_name: string
  enrollment_status: string
  grade: string | null
}

interface StudentProfile {
  student_id: string
  student_name: string
  enrollment_number: string
  email: string
  phone_number: string | null
  department: string | null
  program: string | null
  semester: number | null
  enrolled_courses: Course[]
}

export default function StudentEnrollments() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStudentProfile()
  }, [])

  const loadStudentProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('http://localhost:8000/api/student/profile/', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStudentProfile(data)
    } catch (err: any) {
      console.error('Failed to load student profile:', err)
      setError(err.message || 'Failed to load enrollments')
    } finally {
      setLoading(false)
    }
  }

  const totalCredits = studentProfile?.enrolled_courses.reduce((sum, course) => sum + (course.credits || 0), 0) || 0

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading enrollments...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">⚠️</div>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">Failed to load enrollments</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
            <button onClick={loadStudentProfile} className="btn-primary">Retry</button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Course Enrollments
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              {studentProfile?.student_name} • {studentProfile?.enrollment_number}
            </p>
          </div>
        </div>

        {/* Current Enrollments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Enrollments{studentProfile?.semester ? ` - Semester ${studentProfile.semester}` : ''}</h3>
            <p className="card-description">{totalCredits} Credits Total</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Course Name</th>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Faculty</th>
                  <th className="table-header-cell">Credits</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Grade</th>
                </tr>
              </thead>
              <tbody>
                {studentProfile && studentProfile.enrolled_courses.length > 0 ? (
                  studentProfile.enrolled_courses.map((course) => (
                    <tr key={course.enrollment_id} className="table-row">
                      <td className="table-cell font-medium">{course.course_name}</td>
                      <td className="table-cell border-b border-gray-200 dark:border-gray-600">
                        {course.course_code}
                      </td>
                      <td className="table-cell border-b border-gray-200 dark:border-gray-600">
                        {course.faculty_name || 'TBA'}
                      </td>
                      <td className="table-cell">{course.credits}</td>
                      <td className="table-cell">
                        <span className="badge badge-neutral text-xs">
                          {course.department}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge text-xs ${
                          course.enrollment_status === 'ENROLLED' 
                            ? 'badge-success' 
                            : course.enrollment_status === 'DROPPED'
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}>
                          {course.enrollment_status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {course.grade || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="table-cell text-center text-gray-500 py-8">
                      No enrolled courses
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
