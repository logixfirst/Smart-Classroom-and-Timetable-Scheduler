export interface FacultyProfile {
  faculty_id: string
  faculty_code: string
  faculty_name: string
  email: string
  phone: string | null
  department: string | null
  department_code: string | null
  specialization: string | null
  qualification: string | null
  designation: string | null
  max_workload_per_week: number
  is_active: boolean
  assigned_courses: import('./AssignedSubjectsCard').Subject[]
  total_courses: number
}

interface Props {
  profile: FacultyProfile
}

export function FacultyProfileCard({ profile }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Faculty Profile</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
          <p className="font-medium text-gray-900 dark:text-white">{profile.faculty_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Faculty Code</p>
          <p className="font-medium text-gray-900 dark:text-white">{profile.faculty_code}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
          <p className="font-medium text-gray-900 dark:text-white">{profile.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
          <p className="font-medium text-gray-900 dark:text-white">{profile.department || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
          <p className="font-medium text-gray-900 dark:text-white">{profile.designation || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Specialization</p>
          <p className="font-medium text-gray-900 dark:text-white">{profile.specialization || 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}
