import { z } from 'zod'

// ============================================
// User Validation Schemas
// ============================================

export const userRoles = ['admin', 'faculty', 'student', 'staff'] as const

export const userSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(150, 'Username must not exceed 150 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address').max(254, 'Email must not exceed 254 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character')
    .optional(),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(150, 'First name must not exceed 150 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(150, 'Last name must not exceed 150 characters'),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  department: z.string().min(1, 'Department is required').optional(),
  is_active: z.boolean().default(true),
})

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export type UserFormData = z.infer<typeof userSchema>
export type LoginFormData = z.infer<typeof loginSchema>

// ============================================
// Faculty Validation Schemas
// ============================================

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

// ============================================
// Student Validation Schemas
// ============================================

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

// ============================================
// Department Validation Schemas
// ============================================

export const departmentSchema = z.object({
  department_id: z
    .string()
    .min(1, 'Department ID is required')
    .max(10, 'Department ID must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Department ID must contain only uppercase letters and numbers'),
  department_name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(200, 'Department name must not exceed 200 characters'),
  building_name: z
    .string()
    .min(1, 'Building name is required')
    .max(100, 'Building name must not exceed 100 characters'),
  head_of_department: z.string().optional().or(z.literal('')),
})

export type DepartmentFormData = z.infer<typeof departmentSchema>

// ============================================
// Course Validation Schemas
// ============================================

export const courseLevels = ['UG', 'PG', 'PhD'] as const

export const courseSchema = z.object({
  course_id: z
    .string()
    .min(1, 'Course ID is required')
    .max(10, 'Course ID must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Course ID must contain only uppercase letters and numbers'),
  course_name: z
    .string()
    .min(2, 'Course name must be at least 2 characters')
    .max(200, 'Course name must not exceed 200 characters'),
  duration_years: z
    .number()
    .min(1, 'Duration must be at least 1 year')
    .max(6, 'Duration cannot exceed 6 years')
    .int('Duration must be a whole number'),
  level: z.enum(courseLevels, {
    errorMap: () => ({ message: 'Please select a valid course level' }),
  }),
})

export type CourseFormData = z.infer<typeof courseSchema>

// ============================================
// Subject Validation Schemas
// ============================================

export const subjectSchema = z.object({
  subject_id: z
    .string()
    .min(1, 'Subject ID is required')
    .max(20, 'Subject ID must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Subject ID must contain only uppercase letters and numbers'),
  subject_name: z
    .string()
    .min(2, 'Subject name must be at least 2 characters')
    .max(200, 'Subject name must not exceed 200 characters'),
  subject_code: z
    .string()
    .min(1, 'Subject code is required')
    .max(20, 'Subject code must not exceed 20 characters'),
  credits: z
    .number()
    .min(1, 'Credits must be at least 1')
    .max(10, 'Credits cannot exceed 10')
    .int('Credits must be a whole number'),
  lecture_hours: z
    .number()
    .min(0, 'Lecture hours cannot be negative')
    .max(10, 'Lecture hours cannot exceed 10')
    .int('Lecture hours must be a whole number'),
  lab_hours: z
    .number()
    .min(0, 'Lab hours cannot be negative')
    .max(10, 'Lab hours cannot exceed 10')
    .int('Lab hours must be a whole number'),
  course_id: z.string().min(1, 'Course is required'),
  department_id: z.string().min(1, 'Department is required'),
})

export type SubjectFormData = z.infer<typeof subjectSchema>
export type SubjectInput = z.infer<typeof subjectSchema>

// ============================================
// Classroom Validation Schemas
// ============================================

export const roomTypes = ['lecture hall', 'seminar room', 'conference room', 'auditorium'] as const

export const classroomSchema = z.object({
  room_id: z
    .string()
    .min(1, 'Room ID is required')
    .max(10, 'Room ID must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Room ID must contain only uppercase letters and numbers'),
  room_number: z
    .string()
    .min(1, 'Room number is required')
    .max(20, 'Room number must not exceed 20 characters'),
  capacity: z
    .number()
    .min(1, 'Capacity must be at least 1')
    .max(500, 'Capacity cannot exceed 500')
    .int('Capacity must be a whole number'),
  room_type: z.enum(roomTypes, {
    errorMap: () => ({ message: 'Please select a valid room type' }),
  }),
  department_id: z.string().min(1, 'Department is required'),
})

export type ClassroomFormData = z.infer<typeof classroomSchema>

// ============================================
// Lab Validation Schemas
// ============================================

export const labSchema = z.object({
  lab_id: z
    .string()
    .min(1, 'Lab ID is required')
    .max(10, 'Lab ID must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Lab ID must contain only uppercase letters and numbers'),
  lab_name: z
    .string()
    .min(2, 'Lab name must be at least 2 characters')
    .max(200, 'Lab name must not exceed 200 characters'),
  capacity: z
    .number()
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity cannot exceed 100')
    .int('Capacity must be a whole number'),
  equipment: z
    .string()
    .max(1000, 'Equipment description must not exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  department_id: z.string().min(1, 'Department is required'),
})

export type LabFormData = z.infer<typeof labSchema>

// ============================================
// Batch Validation Schemas
// ============================================

export const batchSchema = z.object({
  batch_id: z
    .string()
    .min(1, 'Batch ID is required')
    .max(20, 'Batch ID must not exceed 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Batch ID must contain only uppercase letters, numbers, and hyphens'),
  batch_name: z
    .string()
    .min(2, 'Batch name must be at least 2 characters')
    .max(100, 'Batch name must not exceed 100 characters'),
  year: z
    .number()
    .min(2020, 'Year must be 2020 or later')
    .max(2030, 'Year cannot exceed 2030')
    .int('Year must be a whole number'),
  semester: z
    .number()
    .min(1, 'Semester must be at least 1')
    .max(10, 'Semester cannot exceed 10')
    .int('Semester must be a whole number'),
  student_count: z
    .number()
    .min(1, 'Student count must be at least 1')
    .max(200, 'Student count cannot exceed 200')
    .int('Student count must be a whole number'),
  course_id: z.string().min(1, 'Course is required'),
  department_id: z.string().min(1, 'Department is required'),
})

export type BatchFormData = z.infer<typeof batchSchema>

// ============================================
// Timetable Generation Validation Schemas
// ============================================

export const timetableGenerationSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Timetable name must be at least 3 characters')
      .max(200, 'Timetable name must not exceed 200 characters'),
    department_ids: z
      .array(z.string())
      .min(1, 'At least one department must be selected')
      .max(20, 'Cannot select more than 20 departments'),
    course_ids: z
      .array(z.string())
      .min(1, 'At least one course must be selected')
      .max(20, 'Cannot select more than 20 courses'),
    start_date: z
      .string()
      .min(1, 'Start date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    end_date: z
      .string()
      .min(1, 'End date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    working_days: z
      .array(z.number().min(0).max(6))
      .min(1, 'At least one working day must be selected')
      .max(7, 'Cannot have more than 7 working days'),
    slots_per_day: z
      .number()
      .min(4, 'Must have at least 4 slots per day')
      .max(12, 'Cannot exceed 12 slots per day')
      .int('Slots per day must be a whole number'),
    optimization_level: z
      .enum(['basic', 'advanced', 'optimal'], {
        errorMap: () => ({ message: 'Please select a valid optimization level' }),
      })
      .default('advanced'),
  })
  .refine(data => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  })

export type TimetableGenerationFormData = z.infer<typeof timetableGenerationSchema>

// ============================================
// Utility Functions
// ============================================

export function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || 'Validation error'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.errors.forEach(err => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return errors
}
