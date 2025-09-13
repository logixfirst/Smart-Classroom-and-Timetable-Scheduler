import DashboardLayout from '@/components/dashboard-layout'

export default function TimetablesPage() {
  const timetables = [
    { id: 1, name: "CS Semester 5 - Fall 2023", department: "Computer Science", semester: 5, status: "Active", lastGenerated: "2023-10-15" },
    { id: 2, name: "Math Semester 3 - Fall 2023", department: "Mathematics", semester: 3, status: "Draft", lastGenerated: "2023-10-14" },
    { id: 3, name: "Physics Semester 2 - Fall 2023", department: "Physics", semester: 2, status: "Pending Approval", lastGenerated: "2023-10-13" },
    { id: 4, name: "CS Semester 3 - Fall 2023", department: "Computer Science", semester: 3, status: "Active", lastGenerated: "2023-10-12" },
  ]

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">Timetable Management</h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn-secondary w-full sm:w-auto">
              <span className="mr-2">⚡</span>
              AI Generate
            </button>
            <button className="btn-primary w-full sm:w-auto">
              <span className="mr-2">📅</span>
              Create Manual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">Quick Generate</h3>
            </div>
            <div className="space-y-4">
              <select className="input-primary w-full">
                <option>Select Department</option>
                <option>Computer Science</option>
                <option>Mathematics</option>
                <option>Physics</option>
              </select>
              <select className="input-primary w-full">
                <option>Select Semester</option>
                <option>Semester 1</option>
                <option>Semester 2</option>
                <option>Semester 3</option>
                <option>Semester 4</option>
                <option>Semester 5</option>
                <option>Semester 6</option>
              </select>
              <button className="btn-primary w-full">
                <span className="mr-2">⚡</span>
                Generate with AI
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">Generation Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Timetables</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Active</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">18</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Pending Approval</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">4</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Drafts</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">2</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-base sm:text-lg">AI Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">94.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Avg. Generation Time</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">2.3 min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Conflicts Resolved</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">156</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Optimization Score</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">8.7/10</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Timetables</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">🔍</span>
                <input 
                  placeholder="Search timetables..." 
                  className="input-primary pl-10 w-full" 
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <select className="input-primary w-full sm:w-36">
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </select>
                <select className="input-primary w-full sm:w-28">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Pending</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {timetables.map((timetable) => (
              <div key={timetable.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">{timetable.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {timetable.department} • Semester {timetable.semester}
                    </p>
                  </div>
                  <span className={`badge ml-2 ${
                    timetable.status === 'Active' ? 'badge-success' :
                    timetable.status === 'Draft' ? 'badge-warning' : 'badge-neutral'
                  }`}>
                    {timetable.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Generated: {timetable.lastGenerated}</span>
                  <div className="flex gap-1">
                    <button className="btn-ghost text-xs px-2 py-1">📅</button>
                    <button className="btn-ghost text-xs px-2 py-1">📥</button>
                    <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell hidden md:table-cell">Department</th>
                  <th className="table-header-cell hidden lg:table-cell">Semester</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell hidden xl:table-cell">Last Generated</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timetables.map((timetable) => (
                  <tr key={timetable.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{timetable.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                        {timetable.department} • Sem {timetable.semester}
                      </div>
                    </td>
                    <td className="table-cell hidden md:table-cell">{timetable.department}</td>
                    <td className="table-cell hidden lg:table-cell">Semester {timetable.semester}</td>
                    <td className="table-cell">
                      <span className={`badge text-xs ${
                        timetable.status === 'Active' ? 'badge-success' :
                        timetable.status === 'Draft' ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {timetable.status}
                      </span>
                    </td>
                    <td className="table-cell hidden xl:table-cell">{timetable.lastGenerated}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 sm:gap-2">
                        <button className="btn-ghost text-xs px-2 py-1">📅</button>
                        <button className="btn-ghost text-xs px-2 py-1">📥</button>
                        <button className="btn-ghost text-xs px-2 py-1">Edit</button>
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