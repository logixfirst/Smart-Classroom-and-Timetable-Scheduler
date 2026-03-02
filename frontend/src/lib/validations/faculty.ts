import { z } from 'zod'

export const designationOptions = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Senior Lecturer',
] as const

export const facultySchema = z.object({
  faculty_id: z
    .string()
    .min(1, 'Faculty ID is required')
    .max(20, 'Faculty ID must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Faculty ID must contain only uppercase letters and numbers'),
  faculty_name: z
    .string()
    .min(2, 'Faculty name must be at least 2 characters')
    .max(200, 'Faculty name must not exceed 200 characters'),
  designation: z.enum(designationOptions, {
    errorMap: () => ({ message: 'Please select a valid designation' }),
  }),
  department_id: z.string().min(1, 'Department is required'),
  specialization: z
    .string()
    .min(2, 'Specialization must be at least 2 characters')
    .max(200, 'Specialization must not exceed 200 characters'),
  max_workload_per_week: z
    .number()
    .min(1, 'Workload must be at least 1 hour')
    .max(40, 'Workload cannot exceed 40 hours per week')
    .default(20),
  email: z.string().email('Invalid email address').max(254, 'Email must not exceed 254 characters'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .optional()
    .or(z.literal('')),
})

export type FacultyFormData = z.infer<typeof facultySchema>

/** Simplified Faculty Schema for Modal CRUD Operations */
export const simpleFacultySchema = z.object({
  faculty_id: z
    .string()
    .min(1, 'Faculty ID is required')
    .max(20, 'Faculty ID must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Faculty ID must contain only uppercase letters and numbers'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  middle_name: z
    .string()
    .max(100, 'Middle name must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),
  designation: z.enum(designationOptions, {
    errorMap: () => ({ message: 'Please select a valid designation' }),
  }),
  specialization: z
    .string()
    .min(2, 'Specialization must be at least 2 characters')
    .max(200, 'Specialization must not exceed 200 characters'),
  max_workload_per_week: z.union([
    z.number().min(1, 'Workload must be at least 1 hour').max(40, 'Workload cannot exceed 40 hours'),
    z.string().min(1, 'Workload is required'),
  ]),
  email: z.string().email('Invalid email address').max(254, 'Email must not exceed 254 characters'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .optional()
    .or(z.literal('')),
  department: z.string().min(1, 'Department is required'),
  status: z.enum(['active', 'inactive', 'on_leave'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
})

export type SimpleFacultyInput = z.infer<typeof simpleFacultySchema>
