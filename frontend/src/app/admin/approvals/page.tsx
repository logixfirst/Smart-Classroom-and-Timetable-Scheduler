"use client"

import DashboardLayout from '@/components/dashboard-layout'

export default function AdminApprovals() {
  const pendingApprovals = [
    { id: 1, type: 'Timetable', requester: 'Dr. Smith', department: 'Computer Science', date: '2024-01-15', priority: 'High' },
    { id: 2, type: 'Room Change', requester: 'Prof. Johnson', department: 'Mathematics', date: '2024-01-14', priority: 'Medium' },
    { id: 3, type: 'Faculty Leave', requester: 'Dr. Brown', department: 'Physics', date: '2024-01-13', priority: 'Low' },
    { id: 4, type: 'Course Update', requester: 'Prof. Davis', department: 'Chemistry', date: '2024-01-12', priority: 'High' },
  ]

  const handleApprove = (id: number) => {
    console.log('Approved:', id)
  }

  const handleReject = (id: number) => {
    console.log('Rejected:', id)
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
              Pending Approvals
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review and approve pending requests
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pending</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">12</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <span className="text-lg">⏳</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">3</p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <span className="text-lg">🚨</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved Today</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">8</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Response Time</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">2.4h</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <span className="text-lg">⏱️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Approvals Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Pending Requests
            </h3>
          </div>
          
          {/* Mobile View */}
          <div className="block sm:hidden space-y-3">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">{approval.type}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{approval.requester}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{approval.department}</p>
                  </div>
                  <span className={`badge ml-2 ${
                    approval.priority === 'High' ? 'badge-danger' :
                    approval.priority === 'Medium' ? 'badge-warning' :
                    'badge-success'
                  }`}>
                    {approval.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{approval.date}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="btn-danger text-xs px-2 py-1"
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

          {/* Desktop View */}
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
                {pendingApprovals.map((approval) => (
                  <tr key={approval.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{approval.type}</div>
                    </td>
                    <td className="table-cell">{approval.requester}</td>
                    <td className="table-cell">{approval.department}</td>
                    <td className="table-cell">{approval.date}</td>
                    <td className="table-cell">
                      <span className={`badge ${
                        approval.priority === 'High' ? 'badge-danger' :
                        approval.priority === 'Medium' ? 'badge-warning' :
                        'badge-success'
                      }`}>
                        {approval.priority}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="btn-danger text-xs px-2 py-1"
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

        {/* Quick Actions */}
        <div className="card">
          <h3 className="card-title mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button className="btn-success flex flex-col items-center gap-2 p-4">
              <span className="text-lg">✅</span>
              <span className="text-sm font-medium">Approve All</span>
            </button>
            <button className="btn-secondary flex flex-col items-center gap-2 p-4">
              <span className="text-lg">📊</span>
              <span className="text-sm font-medium">View Reports</span>
            </button>
            <button className="btn-secondary flex flex-col items-center gap-2 p-4">
              <span className="text-lg">⚙️</span>
              <span className="text-sm font-medium">Settings</span>
            </button>
            <button className="btn-secondary flex flex-col items-center gap-2 p-4">
              <span className="text-lg">📤</span>
              <span className="text-sm font-medium">Export</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}