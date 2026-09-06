import type { StudentProfile } from './types'

interface Props {
  studentProfile: StudentProfile | null
}

export function StudentWelcomeCard({ studentProfile }: Props) {
  return (
    <div className="card">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {studentProfile ? `Welcome back, ${studentProfile.student_name}` : 'Student Dashboard'}
            </h2>
            <p className="text-sm sm:text-base mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              {studentProfile
                ? `${studentProfile.program || 'Program'} • Semester ${studentProfile.current_semester} • ${studentProfile.roll_number || studentProfile.enrollment_number}`
                : 'Loading...'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button className="btn-primary text-xs sm:text-sm px-4 py-3">
              <span className="hidden sm:inline">View Timetable</span>
              <span className="sm:hidden">Schedule</span>
            </button>
            <button className="btn-secondary text-xs sm:text-sm px-4 py-3">
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Courses</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
