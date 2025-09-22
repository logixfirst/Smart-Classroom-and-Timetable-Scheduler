'use client'

import { useState, useEffect } from 'react'

interface Subject {
  id: number
  name: string
  code: string
  department: string
  semester: string
  classesPerWeek: number
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department: '',
    semester: '',
    classes_per_week: '3'
  })

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/courses/')
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId 
      ? `http://localhost:8000/api/v1/courses/${editingId}/`
      : 'http://localhost:8000/api/v1/courses/'
    
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
      name: subject.name,
      code: subject.code,
      department: subject.department,
      semester: subject.semester,
      classes_per_week: subject.classesPerWeek.toString()
    })
    setEditingId(subject.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subject?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/courses/${id}/`, {
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
    setFormData({ name: '', code: '', department: '', semester: '', classes_per_week: '3' })
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
                <label htmlFor="name" className="block text-sm font-medium mb-2">Subject Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-2">Subject Code</label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="input-primary"
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
                  required
                />
              </div>
              <div>
                <label htmlFor="semester" className="block text-sm font-medium mb-2">Semester</label>
                <input
                  id="semester"
                  type="text"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="classes_per_week" className="block text-sm font-medium mb-2">Classes Per Week</label>
                <input
                  id="classes_per_week"
                  type="number"
                  value={formData.classes_per_week}
                  onChange={(e) => setFormData({...formData, classes_per_week: e.target.value})}
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
                <th className="table-header-cell">Code</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Semester</th>
                <th className="table-header-cell">Classes/Week</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="table-row">
                  <td className="table-cell font-medium">{subject.name}</td>
                  <td className="table-cell">
                    <span className="badge badge-neutral">{subject.code}</span>
                  </td>
                  <td className="table-cell">{subject.department}</td>
                  <td className="table-cell">{subject.semester}</td>
                  <td className="table-cell">{subject.classesPerWeek}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
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