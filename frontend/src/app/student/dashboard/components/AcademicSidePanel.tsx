import type { StudentProfile } from './types'

interface Props {
  studentProfile: StudentProfile | null
}

export function AcademicSidePanel({ studentProfile }: Props) {
  return (
    <div className="xl:col-span-1 space-y-4 md:space-y-6">
      {/* Academic Progress */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Academic Progress</h3>
        </div>
        <div className="space-y-4">
          {studentProfile ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>CGPA</span>
                  <span className="font-semibold text-sm sm:text-base" style={{ color: 'var(--color-text-muted)' }}>—</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: '0%', background: 'var(--color-border-strong)' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
                <div className="text-center p-2 sm:p-3 rounded-lg" style={{ background: 'var(--color-bg-surface-2)' }}>
                  <p className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {studentProfile.enrolled_courses?.length || 0}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Courses</p>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-lg" style={{ background: 'var(--color-bg-surface-2)' }}>
                  <p className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {studentProfile.current_semester_credits || 0}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Credits</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
          )}
        </div>
      </div>

      {/* Attendance */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title text-sm sm:text-base">Attendance Overview</h3>
        </div>
        <div className="space-y-3">
          {studentProfile && studentProfile.enrolled_courses.length > 0 ? (
            studentProfile.enrolled_courses.map(course => (
              <div key={course.offering_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-medium truncate block" style={{ color: 'var(--color-text-primary)' }}>
                      {course.course_name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{course.course_code}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>—</span>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</p>
                  </div>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-bg-surface-3)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: '0%', background: 'var(--color-border-strong)' }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No enrolled courses</p>
          )}
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title text-sm sm:text-base">Upcoming Exams</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>Exam schedule data coming soon</p>
        </div>
      </div>
    </div>
  )
}
