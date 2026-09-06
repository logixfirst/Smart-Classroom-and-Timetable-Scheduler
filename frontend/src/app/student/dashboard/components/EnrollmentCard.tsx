import { TableSkeleton } from '@/components/LoadingSkeletons'
import type { StudentProfile } from './types'

interface Props {
  studentProfile: StudentProfile | null
}

export function EnrollmentCard({ studentProfile }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="card-title">Current Enrollment</h3>
            <p className="card-description">
              {studentProfile
                ? `Semester ${studentProfile.current_semester} \u2022 ${studentProfile.current_semester_credits || 0} Credits`
                : 'Loading...'}
            </p>
          </div>
          <button className="btn-primary text-xs px-3 py-2 w-full sm:w-auto">
            Check Clashes
          </button>
        </div>
      </div>

      {!studentProfile ? (
        <TableSkeleton rows={4} columns={3} />
      ) : studentProfile.enrolled_courses.length === 0 ? (
        <div className="text-center py-8">
          <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            No Courses Enrolled
          </h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            You are not enrolled in any courses for this semester.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Course</th>
                <th className="table-header-cell hidden sm:table-cell">Code</th>
                <th className="table-header-cell">Credits</th>
                <th className="table-header-cell hidden md:table-cell">Faculty</th>
                <th className="table-header-cell hidden lg:table-cell">Dept</th>
              </tr>
            </thead>
            <tbody>
              {studentProfile.enrolled_courses.map((course, index) => (
                <tr key={index} className="table-row">
                  <td className="table-cell">{course.course_name}</td>
                  <td className="table-cell hidden sm:table-cell">{course.course_code}</td>
                  <td className="table-cell">{course.credits}</td>
                  <td className="table-cell hidden md:table-cell">{course.faculty_name}</td>
                  <td className="table-cell">{course.department || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
