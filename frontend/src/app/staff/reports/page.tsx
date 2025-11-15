'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function StaffReports() {
  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
              Reports
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Generate and view system reports
            </p>
          </div>
          <button className="btn-primary w-full sm:w-auto">
            <span className="mr-2">📈</span>
            Generate Report
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-4 sm:p-6">
            <h3 className="card-title mb-2">Faculty Utilization</h3>
            <p className="card-description mb-4">Teaching load analysis</p>
            <button className="btn-ghost w-full">
              <span className="mr-2">👥</span>
              View Report
            </button>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="card-title mb-2">Room Usage</h3>
            <p className="card-description mb-4">Classroom occupancy stats</p>
            <button className="btn-ghost w-full">
              <span className="mr-2">🏢</span>
              View Report
            </button>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="card-title mb-2">Attendance</h3>
            <p className="card-description mb-4">Student attendance summary</p>
            <button className="btn-ghost w-full">
              <span className="mr-2">📅</span>
              View Report
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
