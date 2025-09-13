export default function RoleManager() {
  const roles = [
    { name: 'Admin', permissions: ['All Access'], users: 3 },
    { name: 'Staff', permissions: ['Approvals', 'Reports'], users: 8 },
    { name: 'Faculty', permissions: ['Schedule View', 'Preferences'], users: 45 },
    { name: 'Student', permissions: ['Timetable View'], users: 1200 }
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-base sm:text-lg">Role Management</h3>
        <p className="card-description text-xs sm:text-sm">Manage user roles and permissions</p>
      </div>
      <div className="space-y-3">
        {roles.map((role, index) => (
          <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-slate-500/10 backdrop-blur-sm rounded-xl border border-slate-600/30">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm sm:text-base text-white">{role.name}</h4>
              <p className="text-xs sm:text-sm text-slate-300 truncate">{role.permissions.join(', ')}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm sm:text-base font-medium text-white">{role.users}</p>
              <p className="text-xs sm:text-sm text-slate-400">users</p>
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