'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'

interface Faculty {
  id: number
  faculty_id: string
  faculty_name: string
  designation: string
  department: string
  course_taught: string
  elective_assigned: string
  max_workload_per_week: number
}

export default function FacultyManagePage() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')

  useEffect(() => {
    // Set static mock faculty instead of API call
    const mockFaculty = [
      { 
        id: 1, 
        faculty_id: 'FAC001', 
        faculty_name: 'Dr. Rajesh Kumar', 
        designation: 'Professor', 
        department: 'Computer Science', 
        course_taught: 'Data Structures', 
        elective_assigned: 'Machine Learning', 
        max_workload_per_week: 20 
      },
      { 
        id: 2, 
        faculty_id: 'FAC002', 
        faculty_name: 'Dr. Priya Sharma', 
        designation: 'Associate Professor', 
        department: 'Computer Science', 
        course_taught: 'Database Systems', 
        elective_assigned: 'Web Development', 
        max_workload_per_week: 18 
      },
      { 
        id: 3, 
        faculty_id: 'FAC003', 
        faculty_name: 'Prof. Amit Singh', 
        designation: 'Assistant Professor', 
        department: 'Mathematics', 
        course_taught: 'Calculus', 
        elective_assigned: 'Statistics', 
        max_workload_per_week: 16 
      }
    ]
    setFaculty(mockFaculty)
    setIsLoading(false)
  }, [])

  const filteredFaculty = faculty.filter(member => {
    const matchesSearch = member.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.faculty_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || member.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(faculty.map(f => f.department))].filter(Boolean)

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading faculty...</p>
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Faculty Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {filteredFaculty.length} faculty members
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Faculty Members</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <label htmlFor="faculty-search" className="sr-only">Search faculty</label>
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  id="faculty-search"
                  placeholder="Search faculty..." 
                  className="input-primary pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <label htmlFor="department-filter" className="sr-only">Filter by department</label>
              <select 
                id="department-filter"
                className="input-primary w-full sm:w-36"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredFaculty.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl sm:text-6xl mb-4">👨🏫</div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                No Faculty Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {faculty.length === 0 ? 'No faculty data has been imported yet.' : 'No faculty match your search criteria.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {filteredFaculty.map((member) => (
                  <div key={member.id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">{member.faculty_name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.faculty_id}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{member.designation}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="badge badge-neutral text-xs">{member.department}</span>
                        <span className="badge badge-info text-xs">{member.max_workload_per_week}h/week</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p><strong>Course:</strong> {member.course_taught}</p>
                        <p><strong>Elective:</strong> {member.elective_assigned}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Faculty ID</th>
                      <th className="table-header-cell">Name</th>
                      <th className="table-header-cell">Designation</th>
                      <th className="table-header-cell">Department</th>
                      <th className="table-header-cell">Course Taught</th>
                      <th className="table-header-cell">Elective</th>
                      <th className="table-header-cell">Workload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty.map((member) => (
                      <tr key={member.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-mono text-sm">{member.faculty_id}</span>
                        </td>
                        <td className="table-cell">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{member.faculty_name}</div>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-neutral text-xs">{member.designation}</span>
                        </td>
                        <td className="table-cell">{member.department}</td>
                        <td className="table-cell">{member.course_taught}</td>
                        <td className="table-cell">{member.elective_assigned}</td>
                        <td className="table-cell">
                          <span className="badge badge-info text-xs">{member.max_workload_per_week}h/week</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}