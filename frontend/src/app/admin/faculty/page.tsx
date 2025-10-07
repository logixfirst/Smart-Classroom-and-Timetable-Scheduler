'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import apiClient from '@/lib/api'

interface Faculty {
  id: number
  faculty_id: string
  faculty_name: string
  designation: string
  specialization: string
  department: {
    department_id: string
    department_name: string
  }
  max_workload: number
  status: string
}

export default function FacultyManagePage() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false) // New: Table-specific loading
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchFaculty()
  }, [currentPage])

  const fetchFaculty = async () => {
    // For initial load, show full loading. For pagination, show table loading only
    if (currentPage > 1) {
      setIsTableLoading(true)
    } else {
      setIsLoading(true)
    }
    
    setError(null)
    try {
      const response = await apiClient.getFaculty(currentPage)
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setFaculty(response.data.results || response.data)
        if (response.data.count) {
          setTotalPages(Math.ceil(response.data.count / 100))
        }
      }
    } catch (err) {
      setError('Failed to fetch faculty')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false) // Stop both loading states
    }
  }

  const filteredFaculty = faculty.filter(member => {
    const matchesSearch = member.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.faculty_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || member.department.department_name === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(faculty.map(f => f.department.department_name))].filter(Boolean)

  // Pagination handlers with table loading
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }

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
                        <span className="badge badge-neutral text-xs">{member.department.department_name}</span>
                        <span className="badge badge-info text-xs">{member.max_workload}h/week</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p><strong>Specialization:</strong> {member.specialization}</p>
                        <p><strong>Status:</strong> {member.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto relative">
                {/* Table Loading Overlay */}
                {isTableLoading && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
                    </div>
                  </div>
                )}
                
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Faculty ID</th>
                      <th className="table-header-cell">Name</th>
                      <th className="table-header-cell">Designation</th>
                      <th className="table-header-cell">Department</th>
                      <th className="table-header-cell">Specialization</th>
                      <th className="table-header-cell">Workload</th>
                      <th className="table-header-cell">Status</th>
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
                        <td className="table-cell">{member.department.department_name}</td>
                        <td className="table-cell">{member.specialization}</td>
                        <td className="table-cell">
                          <span className="badge badge-info text-xs">{member.max_workload}h/week</span>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-success text-xs">{member.status}</span>
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