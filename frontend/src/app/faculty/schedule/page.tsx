"use client"

import DashboardLayout from '@/components/dashboard-layout'

export default function FacultySchedule() {
  const schedule = [
    { time: '9:00 AM', monday: 'Math 101', tuesday: 'Physics 201', wednesday: 'Math 101', thursday: 'Physics 201', friday: 'Free' },
    { time: '10:00 AM', monday: 'Free', tuesday: 'Math 101', wednesday: 'Free', thursday: 'Math 101', friday: 'Physics 201' },
    { time: '11:00 AM', monday: 'Physics 201', tuesday: 'Free', wednesday: 'Physics 201', thursday: 'Free', friday: 'Math 101' },
    { time: '2:00 PM', monday: 'Lab Session', tuesday: 'Lab Session', wednesday: 'Free', thursday: 'Lab Session', friday: 'Free' },
  ]

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">My Schedule</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">View your weekly teaching schedule</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-primary flex-1 sm:flex-none">
              <span className="mr-2">📄</span>
              Export PDF
            </button>
            <button className="btn-secondary flex-1 sm:flex-none">
              <span className="mr-2">🖨️</span>
              Print
            </button>
          </div>
        </div>

        <div className="card">
          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell">Monday</th>
                  <th className="table-header-cell">Tuesday</th>
                  <th className="table-header-cell">Wednesday</th>
                  <th className="table-header-cell">Thursday</th>
                  <th className="table-header-cell">Friday</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((slot, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{slot.time}</td>
                    <td className="table-cell">{slot.monday}</td>
                    <td className="table-cell">{slot.tuesday}</td>
                    <td className="table-cell">{slot.wednesday}</td>
                    <td className="table-cell">{slot.thursday}</td>
                    <td className="table-cell">{slot.friday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block sm:hidden">
            {schedule.map((slot, index) => (
              <div key={index} className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <h3 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200 mb-3">{slot.time}</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Mon:</span><span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slot.monday}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Tue:</span><span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slot.tuesday}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Wed:</span><span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slot.wednesday}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Thu:</span><span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slot.thursday}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Fri:</span><span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slot.friday}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}