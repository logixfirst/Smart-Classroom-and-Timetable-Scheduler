'use client'

import { useState, useEffect } from 'react'

interface SchoolFormData {
  school_code: string
  school_name: string
  description: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  school?: any
  onSave: (data: SchoolFormData) => Promise<void>
}

const EMPTY: SchoolFormData = { school_code: '', school_name: '', description: '' }

export default function AddEditSchoolModal({ isOpen, onClose, school, onSave }: Props) {
  const [formData, setFormData] = useState<SchoolFormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof SchoolFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (school) {
      setFormData({
        school_code: school.school_code || '',
        school_name: school.school_name || '',
        description: school.description || '',
      })
    } else {
      setFormData(EMPTY)
    }
    setErrors({})
  }, [school, isOpen])

  const validate = (): boolean => {
    const e: Partial<Record<keyof SchoolFormData, string>> = {}
    if (!formData.school_code.trim()) e.school_code = 'School code is required'
    if (!formData.school_name.trim()) e.school_name = 'School name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSave({
        school_code: formData.school_code.trim(),
        school_name: formData.school_name.trim(),
        description: formData.description.trim(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const textField = (
    label: string,
    key: keyof SchoolFormData,
    opts?: { placeholder?: string; required?: boolean; multiline?: boolean }
  ) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {opts?.required !== false && <span className="text-red-500 ml-1">*</span>}
      </label>
      {opts?.multiline ? (
        <textarea
          value={formData[key]}
          rows={3}
          placeholder={opts.placeholder}
          onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
        />
      ) : (
        <input
          type="text"
          value={formData[key]}
          placeholder={opts?.placeholder}
          onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
          className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors[key] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
      )}
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {school ? 'Edit School' : 'Add School'}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {textField('School Code', 'school_code', { placeholder: 'SOE' })}
            {textField('School Name', 'school_name', { placeholder: 'School of Engineering' })}
          </div>
          {textField('Description', 'description', { required: false, placeholder: 'Brief description…', multiline: true })}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : school ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
