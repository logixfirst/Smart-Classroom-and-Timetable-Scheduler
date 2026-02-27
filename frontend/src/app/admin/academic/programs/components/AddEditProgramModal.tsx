'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

interface Department {
  id: number
  dept_code: string
  dept_name: string
}

interface ProgramFormData {
  program_code: string
  program_name: string
  department: string
  duration_years: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  program?: any
  onSave: (data: any) => Promise<void>
}

const EMPTY: ProgramFormData = { program_code: '', program_name: '', department: '', duration_years: '' }

export default function AddEditProgramModal({ isOpen, onClose, program, onSave }: Props) {
  const [formData, setFormData] = useState<ProgramFormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof ProgramFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    if (!isOpen) return
    apiClient.getDepartments(1, 200, '').then(r => {
      if (r.data) setDepartments(r.data.results || r.data)
    })
  }, [isOpen])

  useEffect(() => {
    if (program) {
      setFormData({
        program_code: program.program_code || '',
        program_name: program.program_name || '',
        department: program.department?.id?.toString() || program.department_id?.toString() || '',
        duration_years: program.duration_years?.toString() || '',
      })
    } else {
      setFormData(EMPTY)
    }
    setErrors({})
  }, [program, isOpen])

  const validate = (): boolean => {
    const e: Partial<Record<keyof ProgramFormData, string>> = {}
    if (!formData.program_code.trim()) e.program_code = 'Program code is required'
    if (!formData.program_name.trim()) e.program_name = 'Program name is required'
    if (!formData.department) e.department = 'Department is required'
    if (formData.duration_years && isNaN(Number(formData.duration_years))) {
      e.duration_years = 'Must be a number'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSave({
        program_code: formData.program_code.trim(),
        program_name: formData.program_name.trim(),
        department: formData.department,
        duration_years: formData.duration_years ? Number(formData.duration_years) : null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {program ? 'Edit Program' : 'Add Program'}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Program code */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Program Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.program_code}
                placeholder="BTECH-CSE"
                onChange={e => setFormData(p => ({ ...p, program_code: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.program_code ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.program_code && <p className="text-xs text-red-500">{errors.program_code}</p>}
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Duration (years)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.duration_years}
                placeholder="4"
                onChange={e => setFormData(p => ({ ...p, duration_years: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.duration_years ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.duration_years && <p className="text-xs text-red-500">{errors.duration_years}</p>}
            </div>
          </div>

          {/* Program name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Program Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.program_name}
              placeholder="Bachelor of Technology — Computer Science"
              onChange={e => setFormData(p => ({ ...p, program_name: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.program_name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.program_name && <p className="text-xs text-red-500">{errors.program_name}</p>}
          </div>

          {/* Department select */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              aria-label="Department"
              value={formData.department}
              onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.department ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">— Select department —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.dept_name} ({d.dept_code})</option>
              ))}
            </select>
            {errors.department && <p className="text-xs text-red-500">{errors.department}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : program ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
