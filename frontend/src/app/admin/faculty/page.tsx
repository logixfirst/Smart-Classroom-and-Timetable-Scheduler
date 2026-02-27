'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/Pagination'
import AddEditFacultyModal from './components/AddEditFacultyModal'
import { SimpleFacultyInput } from '@/lib/validations'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'

interface Faculty {
  id: number
  faculty_id: string
  faculty_code: string
  first_name: string
  middle_name?: string
  last_name: string
  designation: string
  specialization: string
  department: {
    dept_id: string
    dept_name: string
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchFaculty()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchFaculty()
  }, [currentPage, itemsPerPage])

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
      const response = await apiClient.getFaculty(currentPage, itemsPerPage, searchTerm)
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
        const response = await apiClient.updateFaculty(String(selectedFaculty.id), {
          faculty_id: facultyData.faculty_id,
          first_name: facultyData.first_name,
          middle_name: facultyData.middle_name || '',
          last_name: facultyData.last_name,
          designation: facultyData.designation,
          specialization: facultyData.specialization,
          max_workload_per_week: facultyData.max_workload_per_week,
          email: facultyData.email,
          phone: facultyData.phone || '',
          department: facultyData.department,
          status: facultyData.status,
        })

        if (response.error) {
          showToast('error', response.error)
        } else {
          showToast('success', 'Faculty updated successfully')
          await fetchFaculty()
        }
      } else {
        const response = await apiClient.createFaculty({
          faculty_id: facultyData.faculty_id,
          first_name: facultyData.first_name,
          middle_name: facultyData.middle_name || '',
          last_name: facultyData.last_name,
          designation: facultyData.designation,
          specialization: facultyData.specialization,
          max_workload_per_week: facultyData.max_workload_per_week,
          email: facultyData.email,
          phone: facultyData.phone || '',
          department: facultyData.department,
          status: facultyData.status,
        })

        if (response.error) {
          showToast('error', response.error)
        } else {
        showToast('success', 'Faculty created successfully. User account also created.')
          await fetchFaculty()
        }
      }
    } catch (error) {
      console.error('Failed to save faculty:', error)
      showToast('error', 'Failed to save faculty')
    }
  }

  const handleDeleteFaculty = async (id: number, facultyName: string) => {
    if (
      !confirm(
        `Delete ${facultyName}?\n\nThis will also delete their user account and cannot be undone.`
      )
    ) {
      return
    }

    setIsDeleting(id)
    try {
      const response = await apiClient.deleteFaculty(String(id))
      if (response.error) {
        showToast('error', response.error)
      } else {
        showToast('success', 'Faculty deleted successfully')
        await fetchFaculty()
      }
    } catch (error) {
      console.error('Failed to delete faculty:', error)
      showToast('error', 'Failed to delete faculty')
    } finally {
      setIsDeleting(null)
    }
  }

  // Client-side filtering for department (search is server-side)
  const filteredFaculty = faculty.filter(member => {
    const matchesDepartment =
      !selectedDepartment || member.department?.dept_name === selectedDepartment
    return matchesDepartment
  })

  const departments = [...new Set(faculty.map(f => f.department?.dept_name).filter(Boolean))].filter(Boolean)

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => fetchFaculty()} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Faculty</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} faculty members`}
          </p>
        </div>
        <button onClick={handleAddFaculty} className="btn-primary w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Faculty
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <label htmlFor="faculty-search" className="sr-only">
                Search faculty
              </label>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
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
        {isLoading && <TableSkeleton rows={5} columns={8} />}

        {!isLoading && filteredFaculty.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No faculty found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {faculty.length === 0
                ? 'No faculty data has been imported yet.'
                : 'No faculty match your search criteria.'}
            </p>
          </div>
        )}

        {!isLoading && filteredFaculty.length > 0 && (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-3">
              {filteredFaculty.map(member => (
                <div
                  key={member.id}
                  className="interactive-element p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {[member.first_name, member.middle_name, member.last_name].filter(Boolean).join(' ')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {member.faculty_code}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {member.designation}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="badge badge-neutral text-xs">
                        {member.department?.dept_name}
                      </span>
                      <span className="badge badge-info text-xs">{member.max_workload}h/week</span>
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
                      onClick={() => handleDeleteFaculty(member.id, `${member.first_name} ${member.last_name}`)}
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
            <div className="hidden lg:block overflow-x-auto">
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
                  {isTableLoading
                    ? <TableRowsSkeleton rows={itemsPerPage} columns={8} />
                    : filteredFaculty.map(member => (
                      <tr key={member.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-mono text-sm">
                            {member.faculty_code}
                          </span>
                        </td>

                        <td className="table-cell">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {[member.first_name, member.middle_name, member.last_name].filter(Boolean).join(' ')}
                          </div>
                        </td>

                        <td className="table-cell">
                          <span className="badge badge-neutral text-xs">
                            {member.designation}
                          </span>
                        </td>

                        <td className="table-cell">
                          {member.department?.dept_name}
                        </td>

                        <td className="table-cell">{member.specialization}</td>

                        <td className="table-cell">
                          <span className="badge badge-info text-xs">
                            {member.max_workload}h/week
                          </span>
                        </td>

                        <td className="table-cell">
                          <span className="badge badge-success text-xs">
                            {member.status}
                          </span>
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
                              onClick={() =>
                                handleDeleteFaculty(member.id, `${member.first_name} ${member.last_name}`)
                              }
                              disabled={isDeleting === member.id}
                              className="btn-danger text-xs px-2 py-1"
                            >
                              {isDeleting === member.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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

      {/* Add/Edit Faculty Modal */}
      <AddEditFacultyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        faculty={selectedFaculty}
        onSave={handleSaveFaculty}
      />
    </div>
  )
}
