// ─── Primitive enums ──────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'FACULTY' | 'STUDENT' | 'STAFF'
export type AcademicStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'GRADUATED'
  | 'DROPPED_OUT'
  | 'RUSTICATED'
  | 'TRANSFERRED'
export type FeeStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'WAIVED'
export type FacultyDesignation =
  | 'PROFESSOR'
  | 'ASSOCIATE_PROFESSOR'
  | 'ASSISTANT_PROFESSOR'
  | 'LECTURER'
  | 'VISITING_FACULTY'
  | 'ADJUNCT_PROFESSOR'
  | 'SENIOR_PROFESSOR'
  | 'EMERITUS_PROFESSOR'
export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'VISITING'
  | 'ADJUNCT'
export type EnrollmentStatus =
  | 'ENROLLED'
  | 'COMPLETED'
  | 'DROPPED'
  | 'WITHDRAWN'
  | 'FAILED'
  | 'INCOMPLETE'
export type OfferingStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
  /**
   * Back-compat: the Django backend returns lowercase role strings
   * ('admin', 'faculty', 'student'). The UserRole enum uses uppercase
   * for new code; accept both via a union so old call-sites still type-check.
   */
  role: 'admin' | 'faculty' | 'student' | 'org_admin' | 'super_admin' | UserRole
  first_name: string
  last_name: string
  org_id?: string
  dept_id?: string
  /** @deprecated use org_id */
  organization?: string
  /** @deprecated use dept_id */
  department?: string
  organization_name?: string
  department_name?: string
  is_active?: boolean
  is_superuser?: boolean
  is_staff?: boolean
}

export interface Student {
  student_id: string
  org_id: string
  program_id: string
  dept_id: string
  enrollment_number: string
  roll_number?: string
  username: string
  email: string
  first_name: string
  middle_name?: string
  last_name: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  date_of_birth: string
  blood_group?: string
  phone_number?: string
  parent_phone?: string
  address?: string
  city?: string
  state?: string
  country: string
  pincode?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  admission_year: number
  admission_date: string
  current_semester: number
  current_year: number
  academic_status: AcademicStatus
  total_credits_earned: number
  current_semester_credits: number
  cgpa: number
  pursuing_minor: boolean
  minor_dept_id?: string
  minor_credits_earned: number
  fee_status: FeeStatus
  scholarship?: string
  is_hosteller: boolean
  hostel_name?: string
  room_number?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  batch_id?: string
}

export interface Faculty {
  faculty_id: string
  org_id: string
  dept_id: string
  faculty_code: string
  username: string
  email: string
  first_name: string
  middle_name?: string
  last_name: string
  title?: 'Dr' | 'Prof' | 'Mr' | 'Ms' | 'Mrs'
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  date_of_birth?: string
  phone_number?: string
  alternate_phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  designation?: FacultyDesignation
  employment_type?: EmploymentType
  highest_qualification?: string
  specialization?: string
  date_of_joining: string
  date_of_leaving?: string
  max_credits_per_semester: number
  max_hours_per_week: number
  max_consecutive_hours: number
  can_teach_cross_department: boolean
  preferred_time_slot?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY'
  research_day?: string
  research_hours_per_week: number
  is_hod: boolean
  is_dean: boolean
  is_proctor: boolean
  can_approve_timetable: boolean
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiPaginatedResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}

export interface ApiError {
  message: string
  code?: string
  field?: string
}
