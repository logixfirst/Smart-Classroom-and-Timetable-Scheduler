import DashboardLayout from '@/components/dashboard-layout'

export default function UsersPage() {
  const users = [
    { id: 1, name: "Dr. John Smith", email: "john.smith@university.edu", role: "Faculty", department: "Computer Science", status: "Active" },
    { id: 2, name: "Sarah Johnson", email: "sarah.johnson@university.edu", role: "Staff", department: "Administration", status: "Active" },
    { id: 3, name: "Mike Wilson", email: "mike.wilson@university.edu", role: "Faculty", department: "Mathematics", status: "Active" },
    { id: 4, name: "Emily Davis", email: "emily.davis@university.edu", role: "Student", department: "Computer Science", status: "Active" },
  ]

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">User Management</h1>
          <button className="btn-primary w-full sm:w-auto px-6 py-3">
            <span className="mr-2 text-lg">➕</span>
            Add User
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  placeholder="Search users..." 
                  className="input-primary pl-10" 
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <select className="input-primary w-full sm:w-32">
                  <option>All Roles</option>
                  <option>Admin</option>
                  <option>Staff</option>
                  <option>Faculty</option>
                  <option>Student</option>
                </select>
                <select className="input-primary w-full sm:w-36">
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {users.map((user) => (
              <div key={user.id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  <span className="badge badge-success ml-2">{user.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="badge badge-neutral">{user.role}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{user.department}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                    <button className="btn-danger text-xs px-2 py-1">Delete</button>
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
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">{user.email}</div>
                    </td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">
                      <span className="badge badge-neutral text-xs">{user.role}</span>
                    </td>
                    <td className="table-cell">{user.department}</td>
                    <td className="table-cell">
                      <span className="badge badge-success text-xs">{user.status}</span>
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