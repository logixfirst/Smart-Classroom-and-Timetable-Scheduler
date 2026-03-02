import type { Subject } from './AssignedSubjectsCard'

interface Props {
  subjects: Subject[]
  maxWorkloadPerWeek: number
}

export function FacultyQuickStats({ subjects, maxWorkloadPerWeek }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div className="card text-center">
        <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
          {subjects.length}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Assigned Courses</div>
      </div>
      <div className="card text-center">
        <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
          {subjects.reduce((sum, course) => sum + course.number_of_sections, 0)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Sections</div>
      </div>
      <div className="card text-center">
        <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
          {subjects.reduce((sum, course) => sum + course.total_enrolled, 0)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Students</div>
      </div>
      <div className="card text-center">
        <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
          {maxWorkloadPerWeek}h
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Max Workload/Week</div>
      </div>
    </div>
  )
}
