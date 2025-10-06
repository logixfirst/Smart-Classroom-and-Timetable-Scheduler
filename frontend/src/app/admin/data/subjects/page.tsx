'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_id: '',
    department: '',
    course: '',
    faculty_assigned: '',
    credits: '3'
  })

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getSubjects()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        // Handle both paginated and non-paginated responses
        const subjectData = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || []
        setSubjects(subjectData)
      }
    } catch (err) {
      setError('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId 
      ? `http://localhost:8000/api/v1/subjects/${editingId}/`
      : 'http://localhost:8000/api/v1/subjects/'
    
    try {
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        loadSubjects()
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save subject:', error)
    }
  }

  const handleEdit = (subject: Subject) => {
    setFormData({
      subject_name: subject.subject_name,
      subject_id: subject.subject_id,
      department: subject.department.department_id,
      course: subject.course.course_id,
      faculty_assigned: subject.faculty_assigned,
      credits: subject.credits.toString()
    })
    setEditingId(subject.subject_id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/subjects/${id}/`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadSubjects()
      }
    } catch (error) {
      console.error('Failed to delete subject:', error)
    }
  }

  const resetForm = () => {
    setFormData({ subject_name: '', subject_id: '', department: '', course: '', faculty_assigned: '', credits: '3' })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
          Subjects ({subjects.length})
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary w-full sm:w-auto"
        >
          Add Subject
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit' : 'Add'} Subject</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject_name" className="block text-sm font-medium mb-2">Subject Name</label>
                <input
                  id="subject_name"
                  type="text"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="subject_id" className="block text-sm font-medium mb-2">Subject ID</label>
                <input
                  id="subject_id"
                  type="text"
                  value={formData.subject_id}
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="course" className="block text-sm font-medium mb-2">Course</label>
                <input
                  id="course"
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                  className="input-primary"
                  placeholder="Course ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium mb-2">Department</label>
                <input
                  id="department"
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="input-primary"
                  placeholder="Department ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="faculty_assigned" className="block text-sm font-medium mb-2">Faculty Assigned</label>
                <input
                  id="faculty_assigned"
                  type="text"
                  value={formData.faculty_assigned}
                  onChange={(e) => setFormData({...formData, faculty_assigned: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="credits" className="block text-sm font-medium mb-2">Credits</label>
                <input
                  id="credits"
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  className="input-primary"
                  min="1"
                  max="10"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button type="submit" className="btn-primary w-full sm:w-auto">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary w-full sm:w-auto">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
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
              {subjects.map((subject) => (
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
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subject.subject_id)}
                        className="btn-danger text-xs px-2 py-1"
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