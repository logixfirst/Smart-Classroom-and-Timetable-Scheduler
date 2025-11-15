export default function RoleManager() {
  const roles = [
    { name: 'Admin', permissions: ['All Access'], users: 3 },
    { name: 'Staff', permissions: ['Approvals', 'Reports'], users: 8 },
    { name: 'Faculty', permissions: ['Schedule View', 'Preferences'], users: 45 },
    { name: 'Student', permissions: ['Timetable View'], users: 1200 },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-base sm:text-lg">Role Management</h3>
        <p className="card-description text-xs sm:text-sm">Manage user roles and permissions</p>
      </div>
      <div className="space-y-3">
        {roles.map((role, index) => (
          <div
            key={index}
            className="interactive-element flex items-center justify-between p-4 border border-gray-200 dark:border-[#3c4043]"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-800 dark:text-gray-200">{role.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {role.permissions.join(', ')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-medium text-gray-800 dark:text-gray-200">{role.users}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">users</p>
            </div>
          </div>
        ))}
        <button className="btn-primary w-full mt-4 text-sm sm:text-base py-2.5 sm:py-3">
          <span className="mr-2">➕</span>
          Add New Role
        </button>
      </div>
    </div>
  )
}
