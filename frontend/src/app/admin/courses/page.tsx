'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import apiClient from '@/lib/api'

interface Course {
  course_id: string
  course_name: string
  duration_years: number
  department: {
    department_id: string
    department_name: string
  }
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.getCourses()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        // Handle both paginated and non-paginated responses
        const courseData = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || []
        setCourses(courseData)
      }
    } catch (err) {
      setError('Failed to fetch courses')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">Course Management</h1>
          <button className="btn-primary w-full sm:w-auto px-6 py-3">
            <span className="mr-2 text-lg">📚</span>
            Add Course
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Courses</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  placeholder="Search courses..." 
                  className="input-primary pl-10 w-full" 
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <select className="input-primary w-full sm:w-36" aria-label="Filter by department">
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </select>
                <select className="input-primary w-full sm:w-28" aria-label="Filter by semester">
                  <option>All Semesters</option>
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                  <option>Semester 3</option>
                  <option>Semester 4</option>
                  <option>Semester 5</option>
                  <option>Semester 6</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {courses.map((course) => (
              <div key={course.course_id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-neutral text-xs">{course.course_id}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{course.duration_years} years</span>
                    </div>
                    <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">{course.course_name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{course.department.department_name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs px-3 py-1 flex-1">Edit</button>
                  <button className="btn-danger text-xs px-3 py-1 flex-1">Delete</button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Course Name</th>
                  <th className="table-header-cell">Credits</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Semester</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.course_id} className="table-row">
                    <td className="table-cell">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{course.course_id}</span>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{course.course_name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 md:hidden">
                        {course.duration_years} years • {course.department.department_name}
                      </div>
                    </td>
                    <td className="table-cell">{course.duration_years} years</td>
                    <td className="table-cell">{course.department.department_name}</td>
                    <td className="table-cell">
                      <span className="badge badge-neutral text-xs">-</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 sm:gap-2">
                        <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                        <button className="btn-danger text-xs px-2 py-1">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}