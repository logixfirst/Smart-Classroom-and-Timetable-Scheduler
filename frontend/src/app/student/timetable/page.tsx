"use client"

import DashboardLayout from '@/components/dashboard-layout'

export default function StudentTimetable() {
  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">My Timetable</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">View your weekly schedule</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-secondary flex-1 sm:flex-none">
              <span className="mr-2">📤</span>
              Export
            </button>
            <button className="btn-primary flex-1 sm:flex-none">
              <span className="mr-2">📅</span>
              Sync Calendar
            </button>
          </div>
        </div>

        {/* Timetable */}
        <div className="card">
          <div className="overflow-x-auto">
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
                {[
                  { time: '09:00 - 10:30', mon: 'Data Structures\nDr. Rajesh Kumar\nLab 1', tue: '', wed: 'Database Systems\nProf. Meera Sharma\nRoom 205', thu: '', fri: 'Software Engineering\nDr. Vikram Gupta\nRoom 301' },
                  { time: '11:00 - 12:30', mon: '', tue: 'Machine Learning\nDr. Anita Verma\nLab 2', wed: '', thu: 'Web Development\nProf. Suresh Reddy\nLab 3', fri: '' },
                  { time: '14:00 - 15:30', mon: 'Technical Writing\nDr. Kavita Joshi\nRoom 101', tue: '', wed: 'Data Structures\nDr. Rajesh Kumar\nRoom 205', thu: '', fri: 'Database Systems\nProf. Meera Sharma\nLab 1' },
                ].map((row, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{row.time}</td>
                    <td className="table-cell">{row.mon && <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs whitespace-pre-line">{row.mon}</div>}</td>
                    <td className="table-cell">{row.tue && <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs whitespace-pre-line">{row.tue}</div>}</td>
                    <td className="table-cell">{row.wed && <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs whitespace-pre-line">{row.wed}</div>}</td>
                    <td className="table-cell">{row.thu && <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs whitespace-pre-line">{row.thu}</div>}</td>
                    <td className="table-cell">{row.fri && <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs whitespace-pre-line">{row.fri}</div>}</td>
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