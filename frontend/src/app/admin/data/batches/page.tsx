'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

interface Batch {
  batch_id: string
  course: {
    course_id: string
    course_name: string
  }
  department: {
    department_id: string
    department_name: string
  }
  year: number
  semester: number
  no_of_students: number
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    batch_id: '',
    course: '',
    department: '',
    year: '',
    semester: '',
    no_of_students: ''
  })

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getBatches()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        // Handle both paginated and non-paginated responses
        const batchData = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || []
        setBatches(batchData)
      }
    } catch (err) {
      setError('Failed to load batches')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId 
      ? `http://localhost:8000/api/v1/auth/batches/${editingId}/`
      : 'http://localhost:8000/api/v1/auth/batches/'
    
    try {
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        loadBatches()
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save batch:', error)
    }
  }

  const handleEdit = (batch: Batch) => {
    setFormData({
      batch_id: batch.batch_id,
      course: batch.course.course_id,
      department: batch.department.department_id,
      year: batch.year.toString(),
      semester: batch.semester.toString(),
      no_of_students: batch.no_of_students.toString()
    })
    setEditingId(batch.batch_id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this batch?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/auth/batches/${id}/`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadBatches()
      }
    } catch (error) {
      console.error('Failed to delete batch:', error)
    }
  }

  const resetForm = () => {
    setFormData({ batch_id: '', course: '', department: '', year: '', semester: '', no_of_students: '' })
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
          Batches ({batches.length})
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary w-full sm:w-auto"
        >
          Add Batch
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit' : 'Add'} Batch</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Batch ID</label>
                <input
                  type="text"
                  value={formData.batch_id}
                  onChange={(e) => setFormData({...formData, batch_id: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., CS-A, CS-B"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Course</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                  className="input-primary"
                  placeholder="Course ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="input-primary"
                  placeholder="Department ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., 1, 2, 3, 4"
                  min="1"
                  max="4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Semester</label>
                <input
                  type="number"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., 1, 2"
                  min="1"
                  max="2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Students</label>
                <input
                  type="number"
                  value={formData.no_of_students}
                  onChange={(e) => setFormData({...formData, no_of_students: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., 60"
                  min="1"
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
                <th className="table-header-cell">Batch ID</th>
                <th className="table-header-cell">Course</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Year</th>
                <th className="table-header-cell">Semester</th>
                <th className="table-header-cell">Students</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.batch_id} className="table-row">
                  <td className="table-cell font-medium">{batch.batch_id}</td>
                  <td className="table-cell">{batch.course.course_name}</td>
                  <td className="table-cell">{batch.department.department_name}</td>
                  <td className="table-cell">Year {batch.year}</td>
                  <td className="table-cell">
                    <span className="badge badge-neutral">Sem {batch.semester}</span>
                  </td>
                  <td className="table-cell">{batch.no_of_students}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(batch)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(batch.batch_id)}
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