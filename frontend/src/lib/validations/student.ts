import { z } from 'zod'

export const studentSchema = z.object({
  student_id: z
    .string()
    .min(1, 'Student ID is required')
    .max(20, 'Student ID must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Student ID must contain only uppercase letters and numbers'),
  name: z
    .string()
    .min(2, 'Student name must be at least 2 characters')
    .max(200, 'Student name must not exceed 200 characters'),
  email: z.string().email('Invalid email address').max(254, 'Email must not exceed 254 characters'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .optional()
    .or(z.literal('')),
  department_id: z.string().min(1, 'Department is required'),
  course_id: z.string().min(1, 'Course is required'),
  year: z
    .number()
    .min(1, 'Year must be at least 1')
    .max(5, 'Year cannot exceed 5')
    .int('Year must be a whole number'),
  semester: z
    .number()
    .min(1, 'Semester must be at least 1')
    .max(10, 'Semester cannot exceed 10')
    .int('Semester must be a whole number'),
  electives: z
    .string()
    .max(500, 'Electives list must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  faculty_advisor_id: z.string().optional().or(z.literal('')),
})

export type StudentFormData = z.infer<typeof studentSchema>

/** Simplified Student Schema for Modal CRUD Operations */
export const simpleStudentSchema = z.object({
  student_id: z
    .string()
    .min(1, 'Student ID is required')
    .max(20, 'Student ID must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Student ID must contain only uppercase letters and numbers'),
  name: z
    .string()
    .min(2, 'Student name must be at least 2 characters')
    .max(200, 'Student name must not exceed 200 characters'),
  email: z.string().email('Invalid email address').max(254, 'Email must not exceed 254 characters'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .optional()
    .or(z.literal('')),
  department: z.string().min(1, 'Department is required'),
  course: z.string().min(1, 'Course is required'),
  year: z.union([
    z.number().min(1, 'Year must be at least 1').max(5, 'Year cannot exceed 5'),
    z.string().min(1, 'Year is required'),
  ]),
  semester: z.union([
    z.number().min(1, 'Semester must be at least 1').max(10, 'Semester cannot exceed 10'),
    z.string().min(1, 'Semester is required'),
  ]),
  electives: z
    .string()
    .max(500, 'Electives list must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  faculty_advisor: z.string().optional().or(z.literal('')),
})

export type SimpleStudentInput = z.infer<typeof simpleStudentSchema>
