import DashboardLayout from '@/components/dashboard-layout'

export default function LogsPage() {
  const logs = [
    {
      id: 1,
      timestamp: '2023-10-15 14:30:25',
      level: 'INFO',
      action: 'User Login',
      user: 'harsh.sharma@sih28.edu',
      details: 'Admin login successful',
    },
    {
      id: 2,
      timestamp: '2023-10-15 14:25:12',
      level: 'SUCCESS',
      action: 'Timetable Generated',
      user: 'system',
      details: 'CS Semester 5 timetable generated successfully',
    },
    {
      id: 3,
      timestamp: '2023-10-15 14:20:08',
      level: 'WARNING',
      action: 'Failed Login',
      user: 'unknown@sih28.edu',
      details: 'Invalid credentials attempt',
    },
    {
      id: 4,
      timestamp: '2023-10-15 14:15:45',
      level: 'INFO',
      action: 'User Created',
      user: 'harsh.sharma@sih28.edu',
      details: 'New faculty member added: Dr. Rajesh Kumar',
    },
    {
      id: 5,
      timestamp: '2023-10-15 14:10:33',
      level: 'ERROR',
      action: 'System Error',
      user: 'system',
      details: 'Database connection timeout',
    },
  ]

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
            System Logs
          </h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="level-filter" className="sr-only">
              Filter by log level
            </label>
            <select id="level-filter" className="input-primary w-full sm:w-32">
              <option>All Levels</option>
              <option>INFO</option>
              <option>SUCCESS</option>
              <option>WARNING</option>
              <option>ERROR</option>
            </select>
            <button className="btn-secondary w-full sm:w-auto">
              <span className="mr-2">📥</span>
              Export
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <label htmlFor="log-search" className="sr-only">
                  Search logs
                </label>
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  🔍
                </span>
                <input
                  id="log-search"
                  placeholder="Search logs..."
                  className="input-primary pl-10 w-full"
                />
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="p-4 bg-gray-50 dark:bg-[#3c4043] rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">{log.action}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {log.details}
                    </p>
                  </div>
                  <span
                    className={`badge ml-2 ${
                      log.level === 'SUCCESS'
                        ? 'badge-success'
                        : log.level === 'WARNING'
                          ? 'badge-warning'
                          : log.level === 'ERROR'
                            ? 'badge-danger'
                            : 'badge-info'
                    }`}
                  >
                    {log.level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{log.timestamp}</span>
                  <span>{log.user}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Timestamp</th>
                  <th className="table-header-cell">Level</th>
                  <th className="table-header-cell">Action</th>
                  <th className="table-header-cell hidden lg:table-cell">User</th>
                  <th className="table-header-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors duration-200"
                  >
                    <td className="table-cell text-xs">{log.timestamp}</td>
                    <td className="table-cell">
                      <span
                        className={`badge text-xs ${
                          log.level === 'SUCCESS'
                            ? 'badge-success'
                            : log.level === 'WARNING'
                              ? 'badge-warning'
                              : log.level === 'ERROR'
                                ? 'badge-danger'
                                : 'badge-info'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="table-cell font-medium">{log.action}</td>
                    <td className="table-cell hidden lg:table-cell text-sm">{log.user}</td>
                    <td className="table-cell text-sm">{log.details}</td>
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

// kslksdjglkdjgl
