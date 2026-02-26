'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import apiClient from '@/lib/api'
import { subjectSchema, type SubjectInput } from '@/lib/validations'
import { FormField, SelectField } from '@/components/FormFields'
import { useToast } from '@/components/Toast'
import Pagination from '@/components/Pagination'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

interface Course {
  course_id: string
  course_code: string
  course_name: string
  department: {
    dept_id: string
    dept_name: string
  }
  credits: number
  course_type?: string
}

export default function SubjectsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { showSuccessToast, showErrorToast } = useToast()

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<SubjectInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      subject_name: '',
      subject_id: '',
      department_id: '',
      course_id: '',
      credits: 3,
      lecture_hours: 3,
      lab_hours: 0,
    },
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      loadSubjects()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    loadSubjects()
  }, [currentPage, itemsPerPage])

  const loadSubjects = async () => {
    if (currentPage > 1) {
      setIsTableLoading(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await apiClient.getCourses(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        const data = response.data
        setCourses(data.results || data)
        setTotalCount(data.count || 0)
        if (data.count) {
          setTotalPages(Math.ceil(data.count / itemsPerPage))
        }
      }
    } catch (err) {
      setError('Failed to load courses')
    } finally {
      setIsTableLoading(false)
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: SubjectInput) => {
    const url = editingId
      ? `http://localhost:8000/api/subjects/${editingId}/`
      : 'http://localhost:8000/api/subjects/'

    try {
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        showSuccessToast(
          editingId ? 'Subject updated successfully!' : 'Subject created successfully!'
        )
        loadSubjects()
        resetForm()
      } else {
        const errorData = await response.json()
        showErrorToast(errorData.message || 'Failed to save subject')
      }
    } catch (error) {
      console.error('Failed to save subject:', error)
      showErrorToast('Network error. Please try again.')
    }
  }

  const handleEdit = (course: Course) => {
    setValue('subject_name', course.course_name)
    setValue('subject_id', course.course_code)
    setValue('department_id', course.department.dept_id)
    setValue('course_id', course.course_id)
    setValue('credits', course.credits)
    setValue('lecture_hours', 3)
    setValue('lab_hours', 0)
    setEditingId(course.course_id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/subjects/${id}/`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showSuccessToast('Subject deleted successfully!')
        loadSubjects()
      } else {
        showErrorToast('Failed to delete subject')
      }
    } catch (error) {
      console.error('Failed to delete subject:', error)
      showErrorToast('Network error. Please try again.')
    }
  }

  const resetForm = () => {
    reset()
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Total: {courses.length} courses</p>
        <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
          Add Course
        </button>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by course name, code, or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-primary w-full"
              />
            </div>
            <p className="text-sm text-gray-600">Total: {totalCount} courses</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit' : 'Add'} Course</h3>
          </div>
          <form onSubmit={handleFormSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Course Name"
                name="subject_name"
                register={register}
                error={errors.subject_name}
                placeholder="e.g., Data Structures"
                required
              />

              <FormField
                label="Course Code"
                name="subject_id"
                register={register}
                error={errors.subject_id}
                placeholder="e.g., CS101"
                required
                helpText="Uppercase letters and numbers only"
              />

              <FormField
                label="Course ID"
                name="course_id"
                register={register}
                error={errors.course_id}
                placeholder="e.g., BTECH-CS"
                required
              />

              <FormField
                label="Department ID"
                name="department_id"
                register={register}
                error={errors.department_id}
                placeholder="e.g., CS"
                required
              />

              <FormField
                label="Credits"
                name="credits"
                type="number"
                register={register}
                error={errors.credits}
                placeholder="1-10"
                required
                helpText="Number of credits (1-10)"
              />

              <FormField
                label="Lecture Hours"
                name="lecture_hours"
                type="number"
                register={register}
                error={errors.lecture_hours}
                placeholder="0-20"
                helpText="Lecture hours per week"
              />

              <FormField
                label="Lab Hours"
                name="lab_hours"
                type="number"
                register={register}
                error={errors.lab_hours}
                placeholder="0-20"
                helpText="Lab hours per week"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                className="btn-primary w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingId ? 'Update Course' : 'Create Course'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <GoogleSpinner size={48} className="mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
          </div>
        )}

        {!isLoading && courses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No courses found</p>
          </div>
        )}

        {!isLoading && courses.length > 0 && (
          <div className="overflow-x-auto relative">
            {/* Table Loading Overlay */}
            {isTableLoading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <GoogleSpinner size={48} />
                <span className="text-sm text-gray-600 dark:text-gray-400 mt-3">Loading...</span>
              </div>
            </div>
          )}

          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Code</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Credits</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.course_id} className="table-row">
                  <td className="table-cell font-medium">{course.course_name}</td>
                  <td className="table-cell"><span className="badge badge-neutral">{course.course_code}</span></td>
                  <td className="table-cell">{course.course_type || '-'}</td>
                  <td className="table-cell">{course.department?.dept_name || 'N/A'}</td>
                  <td className="table-cell">{course.credits}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(course)} className="btn-ghost text-xs px-2 py-1" disabled={isTableLoading}>Edit</button>
                      <button onClick={() => handleDelete(course.course_id)} className="btn-danger text-xs px-2 py-1" disabled={isTableLoading}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

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
    </div>
  )
}
