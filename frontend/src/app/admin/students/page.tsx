'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import Pagination from '@/components/Pagination'
import AddEditStudentModal from './components/AddEditStudentModal'
import { SimpleStudentInput } from '@/lib/validations'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'

interface Student {
  id: number
  student_id: string
  name: string
  email?: string
  phone?: string
  department: {
    department_id: string
    department_name: string
  }
  course: {
    course_id: string
    course_name: string
  }
  electives: string
  year: number
  semester: number
  faculty_advisor: {
    faculty_id: string
    faculty_name: string
  } | null
}

export default function StudentsPage() {
  const { showToast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  useEffect(() => {
    fetchStudents()
  }, [currentPage])

  useEffect(() => {
    // Reset to page 1 when items per page changes
    setCurrentPage(1)
    fetchStudents()
  }, [itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
  }

  const fetchStudents = async () => {
    // For initial load, show full loading. For pagination, show table loading only
    if (currentPage > 1) {
      setIsTableLoading(true)
    } else {
      setIsLoading(true)
    }

    setError(null)
    try {
      const response = await apiClient.getStudents(currentPage)
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setStudents(response.data.results || response.data)
        setTotalCount(response.data.count || 0)
        if (response.data.count) {
          setTotalPages(Math.ceil(response.data.count / itemsPerPage))
        }
      }
    } catch (err) {
      setError('Failed to fetch students')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false) // Stop both loading states
    }
  }

  // CRUD Handlers
  const handleAddStudent = () => {
    setSelectedStudent(null)
    setIsModalOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  const handleSaveStudent = async (studentData: SimpleStudentInput) => {
    try {
      if (selectedStudent) {
        // Update existing student
        const response = await apiClient.updateStudent(selectedStudent.id, {
          student_id: studentData.student_id,
          name: studentData.name,
          email: studentData.email || '',
          phone: studentData.phone || '',
          year: studentData.year,
          semester: studentData.semester,
          electives: studentData.electives || '',
        })
        
        if (response.error) {
          showToast('error', `❌ Failed to update student: ${response.error}`)
        } else {
          showToast('success', '✅ Student updated successfully')
          await fetchStudents()
        }
      } else {
        // Create new student
        const response = await apiClient.createStudent({
          student_id: studentData.student_id,
          name: studentData.name,
          email: studentData.email || '',
          phone: studentData.phone || '',
          year: studentData.year,
          semester: studentData.semester,
          electives: studentData.electives || '',
        })
        
        if (response.error) {
          showToast('error', `❌ Failed to create student: ${response.error}`)
        } else {
          showToast('success', '✅ Student created successfully! User account also created.')
          await fetchStudents()
        }
      }
      setIsModalOpen(false)
      setSelectedStudent(null)
    } catch (err) {
      showToast('error', '❌ An unexpected error occurred')
    }
  }

  const handleDeleteStudent = async (id: number, name: string) => {
    const confirmed = confirm(`Are you sure you want to delete student "${name}"? This will also delete their user account.`)
    if (!confirmed) return

    setIsDeleting(id)
    try {
      const response = await apiClient.deleteStudent(id)
      if (response.error) {
        showToast('error', `❌ Failed to delete student: ${response.error}`)
      } else {
        showToast('success', '✅ Student deleted successfully')
        await fetchStudents()
      }
    } catch (err) {
      showToast('error', '❌ Failed to delete student')
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment =
      !selectedDepartment || student.department.department_name === selectedDepartment
    const matchesYear = !selectedYear || student.year.toString() === selectedYear
    return matchesSearch && matchesDepartment && matchesYear
  })

  const departments = [...new Set(students.map(s => s.department.department_name))].filter(Boolean)
  const years = [...new Set(students.map(s => s.year))].sort((a, b) => a - b)

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading students...</p>
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
              Student Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {totalCount} students | Page {currentPage} of {totalPages}
            </p>
          </div>
          <button 
            onClick={handleAddStudent}
            className="btn-primary w-full sm:w-auto px-6 py-3"
          >
            <span className="mr-2 text-lg">➕</span>
            Add Student
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Students</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <label htmlFor="student-search" className="sr-only">
                  Search students
                </label>
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  id="student-search"
                  placeholder="Search students..."
                  className="input-primary pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
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
                <label htmlFor="year-filter" className="sr-only">
                  Filter by year
                </label>
                <select
                  id="year-filter"
                  className="input-primary w-full sm:w-32"
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl sm:text-6xl mb-4">🎓</div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                No Students Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {students.length === 0
                  ? 'No student data has been imported yet.'
                  : 'No students match your search criteria.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3 relative">
                {/* Mobile Loading Overlay */}
                {isTableLoading && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
                    </div>
                  </div>
                )}

                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {student.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {student.student_id}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {student.course.course_name}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="badge badge-neutral text-xs">
                          {student.department.department_name}
                        </span>
                        <span className="badge badge-info text-xs">Year {student.year}</span>
                        <span className="badge badge-success text-xs">Sem {student.semester}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p>
                          <strong>Electives:</strong> {student.electives || 'None'}
                        </p>
                        <p>
                          <strong>Faculty:</strong>{' '}
                          {student.faculty_advisor?.faculty_name || 'Not assigned'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEditStudent(student)}
                          className="btn-ghost text-xs px-2 py-1"
                          disabled={isDeleting === student.id}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="btn-danger text-xs px-2 py-1"
                          disabled={isDeleting === student.id}
                        >
                          {isDeleting === student.id ? 'Deleting...' : 'Delete'}
                        </button>
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
                      <th className="table-header-cell">Student ID</th>
                      <th className="table-header-cell">Name</th>
                      <th className="table-header-cell">Department</th>
                      <th className="table-header-cell">Course</th>
                      <th className="table-header-cell">Year</th>
                      <th className="table-header-cell">Semester</th>
                      <th className="table-header-cell">Electives</th>
                      <th className="table-header-cell">Faculty</th>
                      <th className="table-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-mono text-sm">{student.student_id}</span>
                        </td>
                        <td className="table-cell">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {student.name}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-neutral text-xs">
                            {student.department.department_name}
                          </span>
                        </td>
                        <td className="table-cell">{student.course.course_name}</td>
                        <td className="table-cell">
                          <span className="badge badge-info text-xs">Year {student.year}</span>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-success text-xs">
                            Sem {student.semester}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="max-w-xs truncate" title={student.electives || 'None'}>
                            {student.electives || 'None'}
                          </div>
                        </td>
                        <td className="table-cell">
                          {student.faculty_advisor?.faculty_name || 'Not assigned'}
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-1 sm:gap-2">
                            <button 
                              onClick={() => handleEditStudent(student)}
                              className="btn-ghost text-xs px-2 py-1"
                              disabled={isDeleting === student.id}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              className="btn-danger text-xs px-2 py-1"
                              disabled={isDeleting === student.id}
                            >
                              {isDeleting === student.id ? 'Deleting...' : 'Del'}
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

      <AddEditStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedStudent(null)
        }}
        onSave={handleSaveStudent}
        student={selectedStudent}
      />
    </DashboardLayout>
  )
}
