'use client'

import { useState, useEffect } from 'react'

interface Batch {
  id: number
  name: string
  department: string
  semester: string
  strength: number
  academic_year: string
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    semester: '',
    strength: '',
    academic_year: ''
  })

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/batches/')
      if (response.ok) {
        const data = await response.json()
        setBatches(data)
      }
    } catch (error) {
      console.error('Failed to load batches:', error)
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
      name: batch.name,
      department: batch.department,
      semester: batch.semester,
      strength: batch.strength.toString(),
      academic_year: batch.academic_year
    })
    setEditingId(batch.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
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
    setFormData({ name: '', department: '', semester: '', strength: '', academic_year: '' })
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
                <label className="block text-sm font-medium mb-2">Batch Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., CS-A, CS-B"
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
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Semester</label>
                <input
                  type="text"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., 1, 2, 3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Strength</label>
                <input
                  type="number"
                  value={formData.strength}
                  onChange={(e) => setFormData({...formData, strength: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., 60"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Academic Year</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
                  className="input-primary"
                  placeholder="e.g., 2024-25"
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
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Semester</th>
                <th className="table-header-cell">Strength</th>
                <th className="table-header-cell">Academic Year</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="table-row">
                  <td className="table-cell font-medium">{batch.name}</td>
                  <td className="table-cell">{batch.department}</td>
                  <td className="table-cell">
                    <span className="badge badge-neutral">{batch.semester}</span>
                  </td>
                  <td className="table-cell">{batch.strength}</td>
                  <td className="table-cell">{batch.academic_year}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(batch)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(batch.id)}
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