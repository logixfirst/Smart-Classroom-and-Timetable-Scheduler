'use client'

import { useState, useEffect } from 'react'

interface Classroom {
  id: number
  roomNumber: string
  capacity: number
  type: string
  department: string
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    room_number: '',
    capacity: '',
    room_type: 'lecture',
    department: ''
  })

  useEffect(() => {
    loadClassrooms()
  }, [])

  const loadClassrooms = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/classrooms/')
      if (response.ok) {
        const data = await response.json()
        setClassrooms(data)
      }
    } catch (error) {
      console.error('Failed to load classrooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId 
      ? `http://localhost:8000/api/v1/classrooms/${editingId}/`
      : 'http://localhost:8000/api/v1/classrooms/'
    
    try {
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        loadClassrooms()
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save classroom:', error)
    }
  }

  const handleEdit = (classroom: Classroom) => {
    setFormData({
      room_number: classroom.roomNumber,
      capacity: classroom.capacity.toString(),
      room_type: classroom.type,
      department: classroom.department
    })
    setEditingId(classroom.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this classroom?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/classrooms/${id}/`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadClassrooms()
      }
    } catch (error) {
      console.error('Failed to delete classroom:', error)
    }
  }

  const resetForm = () => {
    setFormData({ room_number: '', capacity: '', room_type: 'lecture', department: '' })
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
          Classrooms ({classrooms.length})
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary w-full sm:w-auto"
        >
          Add Classroom
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit' : 'Add'} Classroom</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="room_number" className="block text-sm font-medium mb-2">Room Number</label>
                <input
                  id="room_number"
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium mb-2">Capacity</label>
                <input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="room_type" className="block text-sm font-medium mb-2">Type</label>
                <select
                  id="room_type"
                  value={formData.room_type}
                  onChange={(e) => setFormData({...formData, room_type: e.target.value})}
                  className="input-primary"
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                </select>
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium mb-2">Department</label>
                <input id="department" type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="input-primary" />
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
                <th className="table-header-cell">Room Number</th>
                <th className="table-header-cell">Capacity</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((classroom) => (
                <tr key={classroom.id} className="table-row">
                  <td className="table-cell font-medium">{classroom.roomNumber}</td>
                  <td className="table-cell">{classroom.capacity}</td>
                  <td className="table-cell">
                    <span className="badge badge-neutral">{classroom.type}</span>
                  </td>
                  <td className="table-cell">{classroom.department}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(classroom)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(classroom.id)}
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