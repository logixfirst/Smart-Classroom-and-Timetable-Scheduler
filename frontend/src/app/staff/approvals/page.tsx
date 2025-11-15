import DashboardLayout from '@/components/dashboard-layout'

export default function ApprovalsPage() {
  const approvals = [
    {
      id: 1,
      title: 'CS Semester 5 Timetable',
      department: 'Computer Science',
      submittedBy: 'Dr. Smith',
      date: '2024-03-18',
      status: 'pending',
      conflicts: 2,
      students: 120,
    },
    {
      id: 2,
      title: 'Math Semester 3 Schedule',
      department: 'Mathematics',
      submittedBy: 'Prof. Johnson',
      date: '2024-03-17',
      status: 'approved',
      conflicts: 0,
      students: 80,
    },
    {
      id: 3,
      title: 'Physics Lab Schedule',
      department: 'Physics',
      submittedBy: 'Dr. Brown',
      date: '2024-03-16',
      status: 'rejected',
      conflicts: 5,
      students: 60,
    },
    {
      id: 4,
      title: 'EE Semester 4 Practical',
      department: 'Electronics',
      submittedBy: 'Prof. Wilson',
      date: '2024-03-18',
      status: 'validation',
      conflicts: 1,
      students: 90,
    },
  ]

  return (
    <DashboardLayout role="staff">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Timetable Approvals
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select id="status-filter" className="input-primary text-sm w-full sm:w-32">
              <option>All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Validation</option>
            </select>
            <button className="btn-primary text-sm px-4 py-2">
              <span className="mr-2">📊</span>
              Batch Review
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Pending Review
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">4</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">awaiting action</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              In Validation
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">2</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">checking conflicts</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Approved Today
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600">6</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">completed</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Avg. Time
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">2.5h</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">review time</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-sm sm:text-base">Approval Queue</h3>
            <p className="card-description text-xs sm:text-sm">
              Review and validate timetable submissions
            </p>
          </div>

          <div className="space-y-3">
            {approvals.map(approval => (
              <div
                key={approval.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-[#3c4043] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                      {approval.title}
                    </h4>
                    <span
                      className={`badge text-xs self-start ${
                        approval.status === 'pending'
                          ? 'badge-warning'
                          : approval.status === 'approved'
                            ? 'badge-success'
                            : approval.status === 'validation'
                              ? 'badge-info'
                              : 'badge-danger'
                      }`}
                    >
                      {approval.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {approval.department} • Submitted by {approval.submittedBy}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{approval.date}</span>
                    <span>• {approval.students} students</span>
                    <span
                      className={`• ${approval.conflicts > 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {approval.conflicts} conflicts
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button className="btn-ghost text-xs px-3 py-1.5 flex-1 sm:flex-none">
                    <span className="mr-1">👁️</span>
                    View
                  </button>
                  {(approval.status === 'pending' || approval.status === 'validation') && (
                    <>
                      <button className="btn-success text-xs px-3 py-1.5 flex-1 sm:flex-none">
                        Approve
                      </button>
                      <button className="btn-danger text-xs px-3 py-1.5 flex-1 sm:flex-none">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
