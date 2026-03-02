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
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current CGPA</span>
              <span className="font-semibold text-sm sm:text-base text-[#34a853]">8.7</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#34a853] h-2 rounded-full transition-all duration-300"
                style={{ width: '87%' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
            <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
              <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">6</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Courses</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
              <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">24</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Credits</p>
            </div>
          </div>
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
                    <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate block">
                      {course.course_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{course.course_code}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">0%</span>
                    <p className="text-xs text-gray-400">No data</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-gray-400 transition-all duration-300" style={{ width: '0%' }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No enrolled courses</p>
          )}
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title text-sm sm:text-base">Upcoming Exams</h3>
        </div>
        <div className="space-y-3">
          {[
            { subject: 'Database Systems', type: 'Mid-term', date: 'Mar 25', time: '10:00 AM', room: 'Hall A' },
            { subject: 'Data Structures', type: 'Quiz', date: 'Mar 28', time: '2:00 PM', room: 'Lab 1' },
            { subject: 'Software Engineering', type: 'Mid-term', date: 'Apr 2', time: '9:00 AM', room: 'Hall B' },
          ].map((exam, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {exam.subject}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{exam.type} &bull; {exam.room}</p>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{exam.date}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{exam.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
