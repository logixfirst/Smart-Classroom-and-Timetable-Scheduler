'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import apiClient from '@/lib/api'
import { subjectSchema, type SubjectInput } from '@/lib/validations'
import { FormField } from '@/components/FormFields'
import { useToast } from '@/components/Toast'
import Pagination from '@/components/Pagination'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'

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
  const [selectedDept, setSelectedDept] = useState('')
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
    try {
      const payload = {
        course_name: data.subject_name,
        course_code: data.subject_id,
        department:  data.department_id,
        credits:     data.credits,
        lecture_hours_per_week: data.lecture_hours,
        lab_hours_per_week:     data.lab_hours,
      }

      const response = editingId
        ? await apiClient.request<any>(`/courses/${editingId}/`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiClient.request<any>('/courses/', {
            method: 'POST',
            body: JSON.stringify(payload),
          })

      if (response.error) {
        showErrorToast(response.error)
      } else {
        showSuccessToast(editingId ? 'Course updated successfully!' : 'Course created successfully!')
        loadSubjects()
        resetForm()
      }
    } catch {
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
    if (!confirm('Delete this course?')) return

    try {
      const response = await apiClient.request<any>(`/courses/${id}/`, { method: 'DELETE' })
      if (response.error) {
        showErrorToast(response.error)
      } else {
        showSuccessToast('Course deleted successfully!')
        loadSubjects()
      }
    } catch {
      showErrorToast('Network error. Please try again.')
    }
  }

  const resetForm = () => {
    reset()
    setEditingId(null)
    setShowForm(false)
  }

  const deptOptions = useMemo(() => {
    const names = courses.map(c => c.department?.dept_name).filter(Boolean) as string[]
    return [...new Set(names)].sort()
  }, [courses])

  const filteredCourses = useMemo(() => {
    if (!selectedDept) return courses
    return courses.filter(c => c.department?.dept_name === selectedDept)
  }, [courses, selectedDept])

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Courses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} courses`}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Course
        </button>
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
        <div className="card-header">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by course name, code, or department…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-primary pl-10 w-full"
              />
            </div>
            <select
              aria-label="Filter by department"
              className="input-primary w-full sm:w-48"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        {isLoading && <TableSkeleton rows={5} columns={6} />}

        {!isLoading && filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No courses found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {courses.length === 0 ? 'No courses have been added yet.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        )}

        {!isLoading && filteredCourses.length > 0 && (
          <div className="overflow-x-auto">
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
              {isTableLoading
                ? <TableRowsSkeleton rows={itemsPerPage} columns={6} />
                : filteredCourses.map(course => (
                <tr key={course.course_id} className="table-row">
                  <td className="table-cell font-medium">{course.course_name}</td>
                  <td className="table-cell"><span className="badge badge-neutral">{course.course_code}</span></td>
                  <td className="table-cell">{course.course_type || '-'}</td>
                  <td className="table-cell">{course.department?.dept_name || 'N/A'}</td>
                  <td className="table-cell">{course.credits}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(course)} className="btn-edit" disabled={isTableLoading}>Edit</button>
                      <button onClick={() => handleDelete(course.course_id)} className="btn-delete" disabled={isTableLoading}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        </div>
        )}
      </div>
    </div>
  )
}
