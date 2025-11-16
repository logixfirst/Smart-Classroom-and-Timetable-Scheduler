'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { simpleFacultySchema, SimpleFacultyInput, designationOptions } from '@/lib/validations'
import { FormField, SelectField } from '@/components/FormFields'

interface AddEditFacultyModalProps {
  isOpen: boolean
  onClose: () => void
  faculty?: any
  onSave: (facultyData: SimpleFacultyInput) => Promise<void>
}

export default function AddEditFacultyModal({ isOpen, onClose, faculty, onSave }: AddEditFacultyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<SimpleFacultyInput>({
    resolver: zodResolver(simpleFacultySchema),
    defaultValues: {
      faculty_id: '',
      faculty_name: '',
      designation: 'Assistant Professor',
      specialization: '',
      max_workload_per_week: 20,
      email: '',
      phone: '',
      department: '',
      status: 'active'
    }
  })

  useEffect(() => {
    if (faculty) {
      setValue('faculty_id', faculty.faculty_id || '')
      setValue('faculty_name', faculty.faculty_name || '')
      setValue('designation', faculty.designation || 'Assistant Professor')
      setValue('specialization', faculty.specialization || '')
      setValue('max_workload_per_week', faculty.max_workload || 20)
      setValue('email', faculty.email || '')
      setValue('phone', faculty.phone || '')
      setValue('department', faculty.department?.department_name || faculty.department || '')
      setValue('status', faculty.status || 'active')
    } else {
      reset()
    }
  }, [faculty, setValue, reset])

  const onSubmit = async (data: SimpleFacultyInput) => {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        max_workload_per_week: typeof data.max_workload_per_week === 'string' 
          ? parseInt(data.max_workload_per_week) 
          : data.max_workload_per_week
      }
      await onSave(formattedData)
      reset()
      onClose()
    } catch (error) {
      console.error('Failed to save faculty:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {faculty ? '✏️ Edit Faculty Member' : '➕ Add Faculty Member'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isSubmitting}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Faculty ID"
              name="faculty_id"
              type="text"
              placeholder="FAC001"
              register={register}
              error={errors.faculty_id}
              disabled={!!faculty}
              required
            />

            <FormField
              label="Faculty Name"
              name="faculty_name"
              type="text"
              placeholder="Dr. John Doe"
              register={register}
              error={errors.faculty_name}
              required
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              placeholder="john.doe@university.edu"
              register={register}
              error={errors.email}
              required
            />

            <FormField
              label="Phone"
              name="phone"
              type="tel"
              placeholder="1234567890"
              register={register}
              error={errors.phone}
            />

            <SelectField
              label="Designation"
              name="designation"
              options={designationOptions.map(designation => ({
                value: designation,
                label: designation
              }))}
              register={register}
              error={errors.designation}
              required
            />

            <FormField
              label="Specialization"
              name="specialization"
              type="text"
              placeholder="Machine Learning, Data Science"
              register={register}
              error={errors.specialization}
              required
            />

            <FormField
              label="Department"
              name="department"
              type="text"
              placeholder="Computer Science"
              register={register}
              error={errors.department}
              required
            />

            <FormField
              label="Max Workload (hours/week)"
              name="max_workload_per_week"
              type="number"
              placeholder="20"
              register={register}
              error={errors.max_workload_per_week}
              required
            />

            <SelectField
              label="Status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'on_leave', label: 'On Leave' }
              ]}
              register={register}
              error={errors.status}
              required
            />
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </span>
              ) : (
                faculty ? 'Update Faculty' : 'Add Faculty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
