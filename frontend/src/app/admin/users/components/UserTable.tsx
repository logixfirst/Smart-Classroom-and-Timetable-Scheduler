interface User {
  id: number
  name: string
  email: string
  role: string
  department: string
  status: string
}

interface UserTableProps {
  users: User[]
}

export default function UserTable({ users }: UserTableProps) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {users.map(user => (
          <div key={user.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {user.name}
                </h4>
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
                <button className="btn-ghost text-xs px-2 py-1 text-red-600 dark:text-red-400">
                  Delete
                </button>
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
              <th className="table-header-cell hidden md:table-cell">Email</th>
              <th className="table-header-cell">Role</th>
              <th className="table-header-cell hidden lg:table-cell">Department</th>
              <th className="table-header-cell">Status</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="table-row">
                <td className="table-cell">
                  <div className="font-medium text-gray-800 dark:text-gray-200">{user.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                    {user.email}
                  </div>
                </td>
                <td className="table-cell hidden md:table-cell">{user.email}</td>
                <td className="table-cell">
                  <span className="badge badge-neutral text-xs">{user.role}</span>
                </td>
                <td className="table-cell hidden lg:table-cell">{user.department}</td>
                <td className="table-cell">
                  <span className="badge badge-success text-xs">{user.status}</span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-1 sm:gap-2">
                    <button className="btn-ghost text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                      Edit
                    </button>
                    <button className="btn-ghost text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-red-600 dark:text-red-400">
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
