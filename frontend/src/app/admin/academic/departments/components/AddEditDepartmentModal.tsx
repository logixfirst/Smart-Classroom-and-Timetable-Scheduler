'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

interface School {
  id: number
  school_code: string
  school_name: string
}

interface DepartmentFormData {
  dept_code: string
  dept_name: string
  school: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  department?: any
  onSave: (data: DepartmentFormData) => Promise<void>
}

const EMPTY: DepartmentFormData = { dept_code: '', dept_name: '', school: '' }

export default function AddEditDepartmentModal({ isOpen, onClose, department, onSave }: Props) {
  const [formData, setFormData] = useState<DepartmentFormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<DepartmentFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schools, setSchools] = useState<School[]>([])

  useEffect(() => {
    if (!isOpen) return
    apiClient.getSchools(1, 200, '').then(r => {
      if (r.data) setSchools(r.data.results || r.data)
    })
  }, [isOpen])

  useEffect(() => {
    if (department) {
      setFormData({
        dept_code: department.dept_code || '',
        dept_name: department.dept_name || '',
        school: department.school?.id?.toString() || department.school_id?.toString() || '',
      })
    } else {
      setFormData(EMPTY)
    }
    setErrors({})
  }, [department, isOpen])

  const validate = (): boolean => {
    const e: Partial<DepartmentFormData> = {}
    if (!formData.dept_code.trim()) e.dept_code = 'Department code is required'
    if (!formData.dept_name.trim()) e.dept_name = 'Department name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSave({
        dept_code: formData.dept_code.trim(),
        dept_name: formData.dept_name.trim(),
        school: formData.school,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const field = (
    label: string,
    key: keyof DepartmentFormData,
    opts?: { placeholder?: string; required?: boolean }
  ) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{opts?.required !== false && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={formData[key]}
        placeholder={opts?.placeholder}
        onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
        className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors[key] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
      />
      {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {department ? 'Edit Department' : 'Add Department'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Dept Code', 'dept_code', { placeholder: 'CSE' })}
            {field('Department Name', 'dept_name', { placeholder: 'Computer Science & Engineering' })}
          </div>

          {/* School select */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              School <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <select
              aria-label="School"
              value={formData.school}
              onChange={e => setFormData(p => ({ ...p, school: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">— No school —</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.school_name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : department ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
