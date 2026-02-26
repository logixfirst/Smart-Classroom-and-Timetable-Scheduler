'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/Pagination'
import AddEditStudentModal from './components/AddEditStudentModal'
import { SimpleStudentInput } from '@/lib/validations'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-600">
          Total: {totalCount} students | Page {currentPage} of {totalPages}
        </p>

        <button onClick={handleAddStudent} className="btn-primary px-6 py-3">
          ➕ Add Student
        </button>
      </div>

      <div className="card">

        {/* Filters */}
        <div className="card-header">
          <h3 className="card-title">Students</h3>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>

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
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>

              <select
                className="input-primary w-full sm:w-32"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile List (unchanged) */}
        <div className="block sm:hidden space-y-3">
          {filteredStudents.map(student => (
            <div
              key={student.id}
              className="interactive-element p-4 border border-gray-200"
            >
              <div className="font-medium text-gray-800">{student.name}</div>
              <div className="text-sm">{student.student_id}</div>
              <div className="text-xs text-gray-500">
                {student.course?.course_name}
              </div>

              <div className="flex gap-2 mt-2">
                <span className="badge badge-neutral text-xs">{student.department?.department_name}</span>
                <span className="badge badge-info text-xs">Year {student.year}</span>
                <span className="badge badge-success text-xs">Sem {student.semester}</span>
              </div>

              <div className="flex gap-1 mt-2">
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
                  {isDeleting === student.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Course</th>
                <th>Year</th>
                <th>Semester</th>
                <th>Electives</th>
                <th>Faculty</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING SPINNER (works for initial + pagination) */}
              {(isLoading || isTableLoading) && (
                <tr key="loading-spinner">
                  <td colSpan={9}>
                    <div className="flex justify-center items-center py-10">
                      <GoogleSpinner size={48} className="mr-2" />
                      <span className="text-gray-500">
                        Loading students...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows (only show when NOT loading) */}
              {!isLoading && !isTableLoading &&
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.student_id}</td>
                    <td>{student.name}</td>
                    <td>
                      <span className="badge badge-neutral text-xs">
                        {student.department?.department_name}
                      </span>
                    </td>
                    <td>{student.course?.course_name}</td>
                    <td>
                      <span className="badge badge-info text-xs">Year {student.year}</span>
                    </td>
                    <td>
                      <span className="badge badge-success text-xs">Sem {student.semester}</span>
                    </td>
                    <td className="truncate max-w-xs">{student.electives || 'None'}</td>
                    <td>{student.faculty_advisor?.faculty_name || 'Not assigned'}</td>

                    <td>
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
                          {isDeleting === student.id ? 'Deleting...' : 'Del'}
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
          <div className="mt-6 pt-4 border-t border-gray-200">
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
