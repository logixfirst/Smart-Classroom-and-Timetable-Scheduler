'use client'

import DashboardLayout from '@/components/dashboard-layout'
import { useState } from 'react'

export default function FacultyLeaveRequests() {
  const [showForm, setShowForm] = useState(false)

  const leaveRequests = [
    {
      id: 1,
      type: 'Sick Leave',
      startDate: '2024-01-20',
      endDate: '2024-01-22',
      status: 'Pending',
      reason: 'Medical appointment',
    },
    {
      id: 2,
      type: 'Personal Leave',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      status: 'Approved',
      reason: 'Family function',
    },
    {
      id: 3,
      type: 'Conference',
      startDate: '2024-01-10',
      endDate: '2024-01-12',
      status: 'Rejected',
      reason: 'Academic conference',
    },
  ]

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
              Leave Requests
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage your leave applications
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
            New Request
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">1</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">⏳</span>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">1</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">✅</span>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">1</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">❌</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Requests</h3>
          </div>

          <div className="block sm:hidden">
            {leaveRequests.map(request => (
              <div
                key={request.id}
                className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                      {request.type}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {request.startDate} - {request.endDate}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      request.status === 'Approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                        : request.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{request.reason}</p>
              </div>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Start Date</th>
                  <th className="table-header-cell">End Date</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Reason</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(request => (
                  <tr key={request.id} className="table-row">
                    <td className="table-cell font-medium">{request.type}</td>
                    <td className="table-cell">{request.startDate}</td>
                    <td className="table-cell">{request.endDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'Approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                            : request.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="table-cell">{request.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card p-4 sm:p-6 w-full max-w-md">
              <h3 className="card-title mb-4">New Leave Request</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="leave-type" className="form-label">
                    Leave Type
                  </label>
                  <select id="leave-type" className="input-primary">
                    <option>Sick Leave</option>
                    <option>Personal Leave</option>
                    <option>Conference</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="start-date" className="form-label">
                    Start Date
                  </label>
                  <input id="start-date" type="date" className="input-primary" />
                </div>
                <div>
                  <label htmlFor="end-date" className="form-label">
                    End Date
                  </label>
                  <input id="end-date" type="date" className="input-primary" />
                </div>
                <div>
                  <label htmlFor="reason" className="form-label">
                    Reason
                  </label>
                  <textarea id="reason" className="input-primary" rows={3}></textarea>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={() => setShowForm(false)} className="btn-primary">
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
