'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/Pagination'
import AddEditStudentModal from './components/AddEditStudentModal'
import { SimpleStudentInput } from '@/lib/validations'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'

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
  const [isLoading, setIsLoading] = useState(true)        // first load
  const [isTableLoading, setIsTableLoading] = useState(false) // pagination load
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchStudents()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Run on first load + pagination
  useEffect(() => {
    fetchStudents()
  }, [currentPage, itemsPerPage])

  const fetchStudents = async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)

    setError(null)

    try {
      const response = await apiClient.getStudents(currentPage, itemsPerPage, searchTerm)

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        const data = response.data
        setStudents(data.results || data)
        setTotalCount(data.count || 0)

        if (data.count) {
          setTotalPages(Math.ceil(data.count / itemsPerPage))
        }
      }
    } catch (err) {
      setError('Failed to fetch students')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }

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
      let response

      if (selectedStudent) {
        // Update
        response = await apiClient.updateStudent(selectedStudent.id.toString(), {
          ...studentData,
          email: studentData.email || '',
          phone: studentData.phone || '',
          electives: studentData.electives || '',
        })
      } else {
        // Create
        response = await apiClient.createStudent({
          ...studentData,
          email: studentData.email || '',
          phone: studentData.phone || '',
          electives: studentData.electives || '',
        })
      }

      if (response.error) {
        showToast('error', response.error)
      } else {
        showToast('success', selectedStudent ? 'Student updated!' : 'Student created!')
        await fetchStudents()
      }

      setIsModalOpen(false)
      setSelectedStudent(null)
    } catch {
      showToast('error', 'Something went wrong')
    }
  }

  const handleDeleteStudent = async (id: number, name: string) => {
    if (!confirm(`Delete student "${name}"?`)) return

    setIsDeleting(id)

    try {
      const response = await apiClient.deleteStudent(id.toString())

      if (response.error) {
        showToast('error', response.error)
      } else {
        showToast('success', 'Student deleted')
        await fetchStudents()
      }
    } catch {
      showToast('error', 'Failed to delete student')
    } finally {
      setIsDeleting(null)
    }
  }

  // Client-side filtering for department/year (search is server-side)
  const filteredStudents = students.filter(student => {
    const matchesDepartment =
      !selectedDepartment || student.department?.department_name === selectedDepartment

    const matchesYear =
      !selectedYear || student.year.toString() === selectedYear

    return matchesDepartment && matchesYear
  })

  const departments = [...new Set(students.map(s => s.department?.department_name).filter(Boolean))]
  const years = [...new Set(students.map(s => s.year))].sort((a, b) => a - b)

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button onClick={fetchStudents} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} students · Page ${currentPage} of ${totalPages}`}
          </p>
        </div>
        <button onClick={handleAddStudent} className="btn-primary w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </button>
      </div>

      <div className="card">

        {/* Filters */}
        <div className="card-header">
          <h3 className="card-title">Students</h3>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
              </span>

              <input
                placeholder="Search students..."
                className="input-primary pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="input-primary w-full sm:w-36"
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                title="Filter by department"
                aria-label="Filter by department"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>

              <select
                className="input-primary w-full sm:w-32"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                title="Filter by year"
                aria-label="Filter by year"
              >
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={9} />}

        {!isLoading && filteredStudents.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No students found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {students.length === 0 ? 'No student data has been imported yet.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}

        {!isLoading && filteredStudents.length > 0 && (
          <>
            {/* Mobile List */}
            <div className="block lg:hidden space-y-3">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="interactive-element p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{student.student_id}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{student.course?.course_name}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEditStudent(student)} className="btn-ghost text-xs px-2 py-1">Edit</button>
                      <button onClick={() => handleDeleteStudent(student.id, student.name)} className="btn-danger text-xs px-2 py-1" disabled={isDeleting === student.id}>
                        {isDeleting === student.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="badge badge-neutral text-xs">{student.department?.department_name}</span>
                    <span className="badge badge-info text-xs">Year {student.year}</span>
                    <span className="badge badge-success text-xs">Sem {student.semester}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto relative">
              {isTableLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                  <TableSkeleton rows={3} columns={9} />
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
                    <th className="table-header-cell">Faculty Advisor</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="table-row">
                      <td className="table-cell">
                        <span className="font-mono text-sm">{student.student_id}</span>
                      </td>
                      <td className="table-cell font-medium">{student.name}</td>
                      <td className="table-cell">
                        <span className="badge badge-neutral text-xs">
                          {student.department?.department_name}
                        </span>
                      </td>
                      <td className="table-cell">{student.course?.course_name}</td>
                      <td className="table-cell">
                        <span className="badge badge-info text-xs">Year {student.year}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-success text-xs">Sem {student.semester}</span>
                      </td>
                      <td className="table-cell max-w-[160px] truncate">{student.electives || <span className="text-gray-400">None</span>}</td>
                      <td className="table-cell">{student.faculty_advisor?.faculty_name || <span className="text-gray-400">Unassigned</span>}</td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="btn-ghost text-xs px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            className="btn-danger text-xs px-2 py-1"
                            disabled={isDeleting === student.id}
                          >
                            {isDeleting === student.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showItemsPerPage={true}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <AddEditStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedStudent(null)
        }}
        onSave={handleSaveStudent}
        student={selectedStudent}
      />
    </div>
  )
}
