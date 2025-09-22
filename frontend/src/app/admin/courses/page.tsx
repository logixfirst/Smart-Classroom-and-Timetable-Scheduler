import DashboardLayout from '@/components/dashboard-layout'

export default function CoursesPage() {
  const courses = [
    { id: 1, code: "CS101", name: "Introduction to Programming", credits: 3, department: "Computer Science", semester: 1 },
    { id: 2, code: "CS201", name: "Data Structures", credits: 4, department: "Computer Science", semester: 3 },
    { id: 3, code: "MATH101", name: "Calculus I", credits: 3, department: "Mathematics", semester: 1 },
    { id: 4, code: "CS301", name: "Database Systems", credits: 3, department: "Computer Science", semester: 5 },
  ]

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">Course Management</h1>
          <button className="btn-primary w-full sm:w-auto px-6 py-3">
            <span className="mr-2 text-lg">📚</span>
            Add Course
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Courses</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  placeholder="Search courses..." 
                  className="input-primary pl-10 w-full" 
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <select className="input-primary w-full sm:w-36" aria-label="Filter by department">
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </select>
                <select className="input-primary w-full sm:w-28" aria-label="Filter by semester">
                  <option>All Semesters</option>
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                  <option>Semester 3</option>
                  <option>Semester 4</option>
                  <option>Semester 5</option>
                  <option>Semester 6</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-neutral text-xs">{course.code}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{course.credits} credits</span>
                    </div>
                    <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">{course.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{course.department}</p>
                  </div>
                  <span className="badge badge-success text-xs ml-2">Sem {course.semester}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs px-3 py-1 flex-1">Edit</button>
                  <button className="btn-danger text-xs px-3 py-1 flex-1">Delete</button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Course Name</th>
                  <th className="table-header-cell">Credits</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Semester</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="table-row">
                    <td className="table-cell">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{course.code}</span>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{course.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 md:hidden">
                        {course.credits} credits • {course.department}
                      </div>
                    </td>
                    <td className="table-cell">{course.credits}</td>
                    <td className="table-cell">{course.department}</td>
                    <td className="table-cell">
                      <span className="badge badge-neutral text-xs">Sem {course.semester}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 sm:gap-2">
                        <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                        <button className="btn-danger text-xs px-2 py-1">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}