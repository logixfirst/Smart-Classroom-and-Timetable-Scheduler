'use client'

import { useState } from 'react'

interface AddEditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user?: any
}

export default function AddEditUserModal({ isOpen, onClose, user }: AddEditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'faculty',
    department: user?.department || '',
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm sm:max-w-md">
        <div className="card-header">
          <h3 className="card-title">{user ? 'Edit User' : 'Add New User'}</h3>
        </div>
        <form className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="input-primary"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input-primary"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="input-primary"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input
              type="text"
              className="input-primary"
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
