'use client'

import { useState, useEffect } from 'react'

interface BuildingFormData {
  building_code: string
  building_name: string
  address: string
  total_floors: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  building?: any
  onSave: (data: any) => Promise<void>
}

const EMPTY: BuildingFormData = { building_code: '', building_name: '', address: '', total_floors: '' }

export default function AddEditBuildingModal({ isOpen, onClose, building, onSave }: Props) {
  const [formData, setFormData] = useState<BuildingFormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof BuildingFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (building) {
      setFormData({
        building_code: building.building_code || '',
        building_name: building.building_name || '',
        address: building.address || '',
        total_floors: building.total_floors?.toString() || '',
      })
    } else {
      setFormData(EMPTY)
    }
    setErrors({})
  }, [building, isOpen])

  const validate = (): boolean => {
    const e: Partial<Record<keyof BuildingFormData, string>> = {}
    if (!formData.building_code.trim()) e.building_code = 'Building code is required'
    if (!formData.building_name.trim()) e.building_name = 'Building name is required'
    if (formData.total_floors && isNaN(Number(formData.total_floors))) {
      e.total_floors = 'Must be a number'
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
        building_code: formData.building_code.trim(),
        building_name: formData.building_name.trim(),
        address: formData.address.trim(),
        total_floors: formData.total_floors ? Number(formData.total_floors) : null,
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
            {building ? 'Edit Building' : 'Add Building'}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Building code */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Building Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.building_code}
                placeholder="BLK-A"
                onChange={e => setFormData(p => ({ ...p, building_code: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.building_code ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.building_code && <p className="text-xs text-red-500">{errors.building_code}</p>}
            </div>

            {/* Total floors */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Floors
              </label>
              <input
                type="number"
                min={1}
                value={formData.total_floors}
                placeholder="5"
                onChange={e => setFormData(p => ({ ...p, total_floors: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.total_floors ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.total_floors && <p className="text-xs text-red-500">{errors.total_floors}</p>}
            </div>
          </div>

          {/* Building name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Building Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.building_name}
              placeholder="Main Academic Block"
              onChange={e => setFormData(p => ({ ...p, building_name: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.building_name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.building_name && <p className="text-xs text-red-500">{errors.building_name}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              placeholder="Campus address…"
              onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : building ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
