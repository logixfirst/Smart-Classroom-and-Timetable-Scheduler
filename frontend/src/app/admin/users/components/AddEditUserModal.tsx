"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField, SelectField } from '@/components/FormFields'

// Simple user schema for the form
const simpleUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'staff', 'faculty', 'student']),
  department: z.string().min(1, 'Department is required'),
  is_active: z.union([z.boolean(), z.string()])
})

type SimpleUserInput = z.infer<typeof simpleUserSchema>

interface AddEditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user?: any
  onSave: (userData: SimpleUserInput) => Promise<void>
}

export default function AddEditUserModal({ isOpen, onClose, user, onSave }: AddEditUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<SimpleUserInput>({
    resolver: zodResolver(simpleUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: 'faculty',
      department: '',
      is_active: true
    }
  })

  useEffect(() => {
    if (user) {
      setValue('first_name', user.first_name || '')
      setValue('last_name', user.last_name || '')
      setValue('email', user.email || '')
      setValue('role', user.role || 'faculty')
      setValue('department', user.department || '')
      setValue('is_active', user.is_active ?? true)
    } else {
      reset()
    }
  }, [user, setValue, reset])

  const onSubmit = async (data: SimpleUserInput) => {
    setIsSubmitting(true)
    try {
      // Transform data to match expected format
      const userData = {
        ...data,
        username: data.email.split('@')[0], // Generate username from email
        is_active: data.is_active === 'true' || data.is_active === true
      }
      await onSave(userData)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm sm:max-w-lg">
        <div className="card-header">
          <h3 className="card-title">{user ? 'Edit User' : 'Add New User'}</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="First Name"
              name="first_name"
              register={register}
              error={errors.first_name}
              placeholder="Enter first name"
              required
            />
            
            <FormField
              label="Last Name"
              name="last_name"
              register={register}
              error={errors.last_name}
              placeholder="Enter last name"
              required
            />
          </div>
          
          <FormField
            label="Email"
            name="email"
            type="email"
            register={register}
            error={errors.email}
            placeholder="Enter email address"
            required
          />
          
          <SelectField
            label="Role"
            name="role"
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'staff', label: 'Staff' },
              { value: 'faculty', label: 'Faculty' },
              { value: 'student', label: 'Student' }
            ]}
            register={register}
            error={errors.role}
            required
          />
          
          <SelectField
            label="Department"
            name="department"
            options={[
              { value: 'Computer Science', label: 'Computer Science' },
              { value: 'Information Technology', label: 'Information Technology' },
              { value: 'Electronics', label: 'Electronics' },
              { value: 'Mechanical', label: 'Mechanical' },
              { value: 'Civil', label: 'Civil' },
              { value: 'Mathematics', label: 'Mathematics' },
              { value: 'Physics', label: 'Physics' },
              { value: 'Chemistry', label: 'Chemistry' }
            ]}
            register={register}
            error={errors.department}
            required
          />
          
          <SelectField
            label="Status"
            name="is_active"
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
            register={register}
            error={errors.is_active}
            required
          />
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary flex-1" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (user ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}