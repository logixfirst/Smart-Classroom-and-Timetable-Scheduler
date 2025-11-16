'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import Pagination from '@/components/Pagination'
import AddEditFacultyModal from './components/AddEditFacultyModal'
import { SimpleFacultyInput } from '@/lib/validations'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'

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
  email?: string
  phone?: string
}

export default function FacultyManagePage() {
  const { showToast } = useToast()
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  useEffect(() => {
    fetchFaculty()
  }, [currentPage])

  useEffect(() => {
    setCurrentPage(1)
    fetchFaculty()
  }, [itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
  }

  const fetchFaculty = async () => {
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
        setTotalCount(response.data.count || 0)
        if (response.data.count) {
          setTotalPages(Math.ceil(response.data.count / itemsPerPage))
        }
      }
    } catch (err) {
      setError('Failed to fetch faculty')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }

  const handleAddFaculty = () => {
    setSelectedFaculty(null)
    setIsModalOpen(true)
  }

  const handleEditFaculty = (facultyMember: Faculty) => {
    setSelectedFaculty(facultyMember)
    setIsModalOpen(true)
  }

  const handleSaveFaculty = async (facultyData: SimpleFacultyInput) => {
    try {
      if (selectedFaculty) {
        const response = await apiClient.updateFaculty(selectedFaculty.id, {
          faculty_id: facultyData.faculty_id,
          faculty_name: facultyData.faculty_name,
          designation: facultyData.designation,
          specialization: facultyData.specialization,
          max_workload_per_week: facultyData.max_workload_per_week,
          email: facultyData.email,
          phone: facultyData.phone || '',
          department: facultyData.department,
          status: facultyData.status
        })

        if (response.error) {
          showToast('error', response.error)
        } else {
          showToast('success', '✅ Faculty updated successfully')
          await fetchFaculty()
        }
      } else {
        const response = await apiClient.createFaculty({
          faculty_id: facultyData.faculty_id,
          faculty_name: facultyData.faculty_name,
          designation: facultyData.designation,
          specialization: facultyData.specialization,
          max_workload_per_week: facultyData.max_workload_per_week,
          email: facultyData.email,
          phone: facultyData.phone || '',
          department: facultyData.department,
          status: facultyData.status
        })

        if (response.error) {
          showToast('error', response.error)
        } else {
          showToast('success', '✅ Faculty created successfully! User account also created.')
          await fetchFaculty()
        }
      }
    } catch (error) {
      console.error('Failed to save faculty:', error)
      showToast('error', 'Failed to save faculty')
    }
  }

  const handleDeleteFaculty = async (id: number, facultyName: string) => {
    if (!confirm(`⚠️ Are you sure you want to delete ${facultyName}?\n\nThis will also delete their user account and cannot be undone.`)) {
      return
    }

    setIsDeleting(id)
    try {
      const response = await apiClient.deleteFaculty(id)
      if (response.error) {
        showToast('error', response.error)
      } else {
        showToast('success', '✅ Faculty deleted successfully')
        await fetchFaculty()
      }
    } catch (error) {
      console.error('Failed to delete faculty:', error)
      showToast('error', 'Failed to delete faculty')
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredFaculty = faculty.filter(member => {
    const matchesSearch =
      member.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.faculty_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment =
      !selectedDepartment || member.department.department_name === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(faculty.map(f => f.department.department_name))].filter(Boolean)

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
          <button 
            onClick={handleAddFaculty}
            className="btn-primary w-full sm:w-auto px-6 py-3"
          >
            <span className="mr-2 text-lg">➕</span>
            Add Faculty
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Faculty Members</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <label htmlFor="faculty-search" className="sr-only">
                  Search faculty
                </label>
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  id="faculty-search"
                  placeholder="Search faculty..."
                  className="input-primary pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <label htmlFor="department-filter" className="sr-only">
                Filter by department
              </label>
              <select
                id="department-filter"
                className="input-primary w-full sm:w-36"
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
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
                {faculty.length === 0
                  ? 'No faculty data has been imported yet.'
                  : 'No faculty match your search criteria.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {filteredFaculty.map(member => (
                  <div
                    key={member.id}
                    className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {member.faculty_name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.faculty_id}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {member.designation}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="badge badge-neutral text-xs">
                          {member.department.department_name}
                        </span>
                        <span className="badge badge-info text-xs">
                          {member.max_workload}h/week
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p>
                          <strong>Specialization:</strong> {member.specialization}
                        </p>
                        <p>
                          <strong>Status:</strong> {member.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => handleEditFaculty(member)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteFaculty(member.id, member.faculty_name)}
                        disabled={isDeleting === member.id}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        {isDeleting === member.id ? 'Deleting...' : 'Delete'}
                      </button>
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
                      <th className="table-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty.map(member => (
                      <tr key={member.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-mono text-sm">{member.faculty_id}</span>
                        </td>
                        <td className="table-cell">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {member.faculty_name}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-neutral text-xs">{member.designation}</span>
                        </td>
                        <td className="table-cell">{member.department.department_name}</td>
                        <td className="table-cell">{member.specialization}</td>
                        <td className="table-cell">
                          <span className="badge badge-info text-xs">
                            {member.max_workload}h/week
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-success text-xs">{member.status}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditFaculty(member)}
                              className="btn-ghost text-xs px-2 py-1"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteFaculty(member.id, member.faculty_name)}
                              disabled={isDeleting === member.id}
                              className="btn-danger text-xs px-2 py-1"
                            >
                              {isDeleting === member.id ? 'Deleting...' : 'Del'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-[#3c4043]">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    showItemsPerPage={true}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Faculty Modal */}
      <AddEditFacultyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        faculty={selectedFaculty}
        onSave={handleSaveFaculty}
      />
    </DashboardLayout>
  )
}
