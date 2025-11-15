'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import apiClient from '@/lib/api'
import { subjectSchema, type SubjectInput } from '@/lib/validations'
import { FormField, SelectField } from '@/components/FormFields'
import { useToast } from '@/components/Toast'

interface Subject {
  subject_id: string
  subject_name: string
  course: {
    course_id: string
    course_name: string
  }
  department: {
    department_id: string
    department_name: string
  }
  faculty_assigned: string
  credits: number
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
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

  useEffect(() => {
    loadSubjects()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        loadSubjects(true)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const loadSubjects = async (isRefresh = false) => {
    if (isRefresh) {
      setIsTableLoading(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await apiClient.getSubjects()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        // Handle both paginated and non-paginated responses
        let subjectData = Array.isArray(response.data) ? response.data : response.data.results || []

        // Filter by search term
        if (searchTerm) {
          subjectData = subjectData.filter(
            (subject: Subject) =>
              subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              subject.subject_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
              subject.course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              subject.department.department_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }

        setSubjects(subjectData)
      }
    } catch (err) {
      setError('Failed to load subjects')
    } finally {
      if (isRefresh) {
        setIsTableLoading(false)
      } else {
        setIsLoading(false)
      }
    }
  }

  const onSubmit = async (data: SubjectInput) => {
    const url = editingId
      ? `http://localhost:8000/api/v1/subjects/${editingId}/`
      : 'http://localhost:8000/api/v1/subjects/'

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

  const handleEdit = (subject: Subject) => {
    setValue('subject_name', subject.subject_name)
    setValue('subject_id', subject.subject_id)
    setValue('department_id', subject.department.department_id)
    setValue('course_id', subject.course.course_id)
    setValue('credits', subject.credits)
    setValue('lecture_hours', 3)
    setValue('lab_hours', 0)
    setEditingId(subject.subject_id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/v1/subjects/${id}/`, {
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

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
          Subjects ({subjects.length})
        </h2>
        <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
          Add Subject
        </button>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by subject name, ID, course, or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-primary w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit' : 'Add'} Subject</h3>
          </div>
          <form onSubmit={handleFormSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Subject Name"
                name="subject_name"
                register={register}
                error={errors.subject_name}
                placeholder="e.g., Data Structures"
                required
              />

              <FormField
                label="Subject ID"
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
                {isSubmitting ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject'}
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
        <div className="overflow-x-auto relative">
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
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Subject ID</th>
                <th className="table-header-cell">Course</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Faculty</th>
                <th className="table-header-cell">Credits</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(subject => (
                <tr key={subject.subject_id} className="table-row">
                  <td className="table-cell font-medium">{subject.subject_name}</td>
                  <td className="table-cell">
                    <span className="badge badge-neutral">{subject.subject_id}</span>
                  </td>
                  <td className="table-cell">{subject.course.course_name}</td>
                  <td className="table-cell">{subject.department.department_name}</td>
                  <td className="table-cell">{subject.faculty_assigned}</td>
                  <td className="table-cell">{subject.credits}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="btn-ghost text-xs px-2 py-1"
                        disabled={isTableLoading}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subject.subject_id)}
                        className="btn-danger text-xs px-2 py-1"
                        disabled={isTableLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
