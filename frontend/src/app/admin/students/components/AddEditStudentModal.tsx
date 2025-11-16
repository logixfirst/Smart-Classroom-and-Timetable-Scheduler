'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { simpleStudentSchema, SimpleStudentInput } from '@/lib/validations'
import { FormField, SelectField } from '@/components/FormFields'

interface AddEditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  student?: any
  onSave: (studentData: SimpleStudentInput) => Promise<void>
}

export default function AddEditStudentModal({ isOpen, onClose, student, onSave }: AddEditStudentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<SimpleStudentInput>({
    resolver: zodResolver(simpleStudentSchema),
    defaultValues: {
      student_id: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      course: '',
      year: 1,
      semester: 1,
      electives: '',
      faculty_advisor: ''
    }
  })

  useEffect(() => {
    if (student) {
      setValue('student_id', student.student_id || '')
      setValue('name', student.name || '')
      setValue('email', student.email || '')
      setValue('phone', student.phone || '')
      setValue('department', student.department?.department_name || student.department || '')
      setValue('course', student.course?.course_name || student.course || '')
      setValue('year', student.year || 1)
      setValue('semester', student.semester || 1)
      setValue('electives', student.electives || '')
      setValue('faculty_advisor', student.faculty_advisor?.faculty_name || student.faculty_advisor || '')
    } else {
      reset()
    }
  }, [student, setValue, reset])

  const onSubmit = async (data: SimpleStudentInput) => {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        year: typeof data.year === 'string' ? parseInt(data.year) : data.year,
        semester: typeof data.semester === 'string' ? parseInt(data.semester) : data.semester
      }
      await onSave(formattedData)
      reset()
      onClose()
    } catch (error) {
      console.error('Failed to save student:', error)
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
            {student ? '✏️ Edit Student' : '➕ Add Student'}
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
              label="Student ID"
              name="student_id"
              type="text"
              placeholder="STU001"
              register={register}
              error={errors.student_id}
              disabled={!!student}
              required
            />

            <FormField
              label="Student Name"
              name="name"
              type="text"
              placeholder="Jane Smith"
              register={register}
              error={errors.name}
              required
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              placeholder="jane.smith@university.edu"
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
              label="Course"
              name="course"
              type="text"
              placeholder="B.Tech Computer Science"
              register={register}
              error={errors.course}
              required
            />

            <SelectField
              label="Year"
              name="year"
              options={[
                { value: '1', label: '1st Year' },
                { value: '2', label: '2nd Year' },
                { value: '3', label: '3rd Year' },
                { value: '4', label: '4th Year' },
                { value: '5', label: '5th Year' }
              ]}
              register={register}
              error={errors.year}
              required
            />

            <SelectField
              label="Semester"
              name="semester"
              options={[
                { value: '1', label: 'Semester 1' },
                { value: '2', label: 'Semester 2' },
                { value: '3', label: 'Semester 3' },
                { value: '4', label: 'Semester 4' },
                { value: '5', label: 'Semester 5' },
                { value: '6', label: 'Semester 6' },
                { value: '7', label: 'Semester 7' },
                { value: '8', label: 'Semester 8' },
                { value: '9', label: 'Semester 9' },
                { value: '10', label: 'Semester 10' }
              ]}
              register={register}
              error={errors.semester}
              required
            />

            <FormField
              label="Electives (Optional)"
              name="electives"
              type="text"
              placeholder="Machine Learning, Cloud Computing"
              register={register}
              error={errors.electives}
            />

            <FormField
              label="Faculty Advisor (Optional)"
              name="faculty_advisor"
              type="text"
              placeholder="Dr. John Doe"
              register={register}
              error={errors.faculty_advisor}
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
                student ? 'Update Student' : 'Add Student'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
