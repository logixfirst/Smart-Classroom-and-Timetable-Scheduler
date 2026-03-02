export interface Course {
  offering_id: string
  course_code: string
  course_name: string
  credits: number
  department: string | null
  faculty_name: string
  academic_year: string
  semester_type: string
  semester_number: number
  total_enrolled: number
  number_of_sections: number
}

export interface StudentProfile {
  student_id: string
  enrollment_number: string
  roll_number: string | null
  student_name: string
  email: string
  phone: string | null
  department: string | null
  department_code: string | null
  program: string | null
  program_code: string | null
  current_semester: number
  current_year: number
  admission_year: number
  cgpa: number | null
  total_credits_earned: number | null
  current_semester_credits: number | null
  academic_status: string | null
  is_active: boolean
  enrolled_courses: Course[]
  total_courses: number
}

export interface TodayClass {
  time: string
  subject: string
  code: string
  faculty: string
  room: string
  status: 'upcoming' | 'current' | 'completed'
  type: string
}
