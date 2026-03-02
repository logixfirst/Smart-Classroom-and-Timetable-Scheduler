import { z } from 'zod'

// ─── Building ─────────────────────────────────────────────────────────────────

export const buildingSchema = z.object({
  building_id: z
    .string()
    .min(1, 'Building ID is required')
    .max(10, 'Building ID must not exceed 10 characters'),
  building_name: z
    .string()
    .min(2, 'Building name must be at least 2 characters')
    .max(100, 'Building name must not exceed 100 characters'),
})

export type BuildingFormData = z.infer<typeof buildingSchema>

// ─── Department ───────────────────────────────────────────────────────────────

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

// ─── Program ──────────────────────────────────────────────────────────────────

export const programSchema = z.object({
  program_id: z
    .string()
    .min(1, 'Program ID is required')
    .max(10, 'Program ID must not exceed 10 characters'),
  program_name: z
    .string()
    .min(2, 'Program name must be at least 2 characters')
    .max(200, 'Program name must not exceed 200 characters'),
})

export type ProgramFormData = z.infer<typeof programSchema>

// ─── Room ─────────────────────────────────────────────────────────────────────

export const roomTypes = ['lecture hall', 'seminar room', 'conference room', 'auditorium'] as const

export const roomSchema = z.object({
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

export type RoomFormData = z.infer<typeof roomSchema>
/** @deprecated use RoomFormData */
export type ClassroomFormData = RoomFormData

// ─── School ───────────────────────────────────────────────────────────────────

export const schoolSchema = z.object({
  school_id: z
    .string()
    .min(1, 'School ID is required')
    .max(10, 'School ID must not exceed 10 characters'),
  school_name: z
    .string()
    .min(2, 'School name must be at least 2 characters')
    .max(200, 'School name must not exceed 200 characters'),
})

export type SchoolFormData = z.infer<typeof schoolSchema>

// ─── Course (top-level academic programme) ────────────────────────────────────

export const courseLevels = ['UG', 'PG', 'PhD'] as const

export const academicCourseSchema = z.object({
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

export type AcademicCourseFormData = z.infer<typeof academicCourseSchema>
/** @deprecated use academicCourseSchema */
export const courseSchema = academicCourseSchema
/** @deprecated use AcademicCourseFormData */
export type CourseFormData = AcademicCourseFormData

// ─── Subject (individual subject in a course) ────────────────────────────────

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
export type SubjectInput = SubjectFormData

// ─── Batch ────────────────────────────────────────────────────────────────────

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

// ─── Lab ─────────────────────────────────────────────────────────────────────

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
