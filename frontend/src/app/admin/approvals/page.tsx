'use client'

export default function AdminApprovals() {
  const pendingApprovals = [
    {
      id: 1,
      type: 'Timetable',
      requester: 'Dr. Smith',
      department: 'Computer Science',
      date: '2024-01-15',
      priority: 'High',
    },
    {
      id: 2,
      type: 'Room Change',
      requester: 'Prof. Johnson',
      department: 'Mathematics',
      date: '2024-01-14',
      priority: 'Medium',
    },
    {
      id: 3,
      type: 'Faculty Leave',
      requester: 'Dr. Brown',
      department: 'Physics',
      date: '2024-01-13',
      priority: 'Low',
    },
    {
      id: 4,
      type: 'Course Update',
      requester: 'Prof. Davis',
      department: 'Chemistry',
      date: '2024-01-12',
      priority: 'High',
    },
  ]

  const handleApprove = (id: number) => {
    console.log('Approved:', id)
  }

  const handleReject = (id: number) => {
    console.log('Rejected:', id)
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Approvals
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Review and act on pending requests from faculty and departments
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select className="input-primary w-full sm:w-36" aria-label="Filter by approval type">
            <option>All Types</option>
            <option>Timetable</option>
            <option>Room Change</option>
            <option>Faculty Leave</option>
            <option>Course Update</option>
          </select>
          <select className="input-primary w-full sm:w-32" aria-label="Filter by priority level">
            <option>All Priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Total Pending */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Total Pending
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                12
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-warning-subtle)' }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--color-warning-text)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* High Priority */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                High Priority
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-danger-text)' }}>
                3
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-danger-subtle)' }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--color-danger-text)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Approved Today */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Approved Today
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-success-text)' }}>
                8
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-success-subtle)' }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--color-success-text)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Avg. Response Time
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-info-text)' }}>
                2.4h
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-info-subtle)' }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--color-info-text)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* ── Approvals Table ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pending Requests</h3>
          <p className="card-description">{pendingApprovals.length} requests awaiting review</p>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {pendingApprovals.map(approval => (
            <div
              key={approval.id}
              className="interactive-element p-4 rounded-lg border"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {approval.type}
                  </h4>
                  <p className="text-sm truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {approval.requester}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {approval.department}
                  </p>
                </div>
                <span
                  className={`badge ml-2 ${
                    approval.priority === 'High'
                      ? 'badge-danger'
                      : approval.priority === 'Medium'
                        ? 'badge-warning'
                        : 'badge-success'
                  }`}
                >
                  {approval.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {approval.date}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleReject(approval.id)}
                    className="btn-delete"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(approval.id)}
                    className="btn-success text-xs px-2 py-1"
                  >
                    Approve
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
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Requester</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Priority</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map(approval => (
                  <tr key={approval.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {approval.type}
                      </div>
                    </td>
                    <td className="table-cell">{approval.requester}</td>
                    <td className="table-cell">{approval.department}</td>
                    <td className="table-cell">{approval.date}</td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          approval.priority === 'High'
                            ? 'badge-danger'
                            : approval.priority === 'Medium'
                              ? 'badge-warning'
                              : 'badge-success'
                        }`}
                      >
                        {approval.priority}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="btn-delete"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="btn-success text-xs px-2 py-1"
                        >
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
          <p className="card-description">Bulk operations and shortcuts</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button className="btn-success flex flex-col items-center gap-2 py-4 px-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Approve All</span>
          </button>
          <button className="btn-secondary flex flex-col items-center gap-2 py-4 px-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">View Reports</span>
          </button>
          <button className="btn-secondary flex flex-col items-center gap-2 py-4 px-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">Settings</span>
          </button>
          <button className="btn-secondary flex flex-col items-center gap-2 py-4 px-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 12m4 4V4" />
            </svg>
            <span className="text-xs font-medium">Export</span>
          </button>
        </div>
      </div>
    </div>
  )
}
