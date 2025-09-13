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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              Pending Approvals
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Review and approve pending requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input-primary">
              <option>All Types</option>
              <option>Timetable</option>
              <option>Room Change</option>
              <option>Faculty Leave</option>
              <option>Course Update</option>
            </select>
            <select className="input-primary">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="card hover:shadow-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Total Pending</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
              <div className="w-10 h-10 bg-amber-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-amber-400/30">
                <span className="text-lg">⏳</span>
              </div>
            </div>
          </div>
          
          <div className="card hover:shadow-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">High Priority</p>
                <p className="text-2xl font-bold text-red-400">3</p>
              </div>
              <div className="w-10 h-10 bg-red-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-red-400/30">
                <span className="text-lg">🚨</span>
              </div>
            </div>
          </div>
          
          <div className="card hover:shadow-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Approved Today</p>
                <p className="text-2xl font-bold text-emerald-400">8</p>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-emerald-400/30">
                <span className="text-lg">✅</span>
              </div>
            </div>
          </div>
          
          <div className="card hover:shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Avg. Response Time</p>
                <p className="text-2xl font-bold text-blue-400">2.4h</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-400/30">
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
              <div key={approval.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white">{approval.type}</h4>
                    <p className="text-sm text-slate-300">{approval.requester}</p>
                    <p className="text-xs text-slate-400">{approval.department}</p>
                  </div>
                  <span className={`badge ${
                    approval.priority === 'High' ? 'badge-danger' :
                    approval.priority === 'Medium' ? 'badge-warning' :
                    'badge-success'
                  }`}>
                    {approval.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{approval.date}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="px-3 py-1 text-xs font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-400/30 rounded-lg transition-all duration-300"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="px-3 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/30 rounded-lg transition-all duration-300"
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
                  <tr key={approval.id} className="hover:bg-slate-500/10 transition-all duration-300">
                    <td className="table-cell font-medium">{approval.type}</td>
                    <td className="table-cell text-slate-300">{approval.requester}</td>
                    <td className="table-cell text-slate-300">{approval.department}</td>
                    <td className="table-cell text-slate-300">{approval.date}</td>
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="px-3 py-1 text-xs font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-400/30 rounded-lg transition-all duration-300"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="px-3 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/30 rounded-lg transition-all duration-300"
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
            <button className="flex flex-col items-center p-3 bg-emerald-500/20 backdrop-blur-sm rounded-xl hover:bg-emerald-500/30 hover:shadow-emerald-500/20 border border-emerald-400/30 transition-all duration-300">
              <span className="text-lg mb-1">✅</span>
              <span className="text-xs font-medium text-emerald-300">Approve All</span>
            </button>
            <button className="flex flex-col items-center p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl hover:bg-blue-500/30 hover:shadow-blue-500/20 border border-blue-400/30 transition-all duration-300">
              <span className="text-lg mb-1">📊</span>
              <span className="text-xs font-medium text-blue-300">View Reports</span>
            </button>
            <button className="flex flex-col items-center p-3 bg-purple-500/20 backdrop-blur-sm rounded-xl hover:bg-purple-500/30 hover:shadow-purple-500/20 border border-purple-400/30 transition-all duration-300">
              <span className="text-lg mb-1">⚙️</span>
              <span className="text-xs font-medium text-purple-300">Settings</span>
            </button>
            <button className="flex flex-col items-center p-3 bg-orange-500/20 backdrop-blur-sm rounded-xl hover:bg-orange-500/30 hover:shadow-orange-500/20 border border-orange-400/30 transition-all duration-300">
              <span className="text-lg mb-1">📤</span>
              <span className="text-xs font-medium text-orange-300">Export</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}