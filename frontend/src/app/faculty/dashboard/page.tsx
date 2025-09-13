"use client"

import DashboardLayout from '@/components/dashboard-layout'

export default function FacultyDashboard() {
  return (
    <DashboardLayout role="faculty">
      <div className="space-y-4 md:space-y-6">
        {/* Welcome Section */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
                Welcome back, Dr. Rajesh Kumar
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
                Computer Science Department • Today's overview
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button className="btn-primary px-6 py-3">
                📅 View Schedule
              </button>
              <button className="btn-secondary px-6 py-3">
                ⚙️ Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3 lg:gap-4">
          <button className="btn-primary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">📅</span>
            <span>Schedule</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">👥</span>
            <span>Students</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">💬</span>
            <span>Announce</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">🔧</span>
            <span>Resources</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">📊</span>
            <span>Analytics</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">⚙️</span>
            <span>Profiles</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">🔄</span>
            <span>Swap</span>
          </button>
          <button className="btn-secondary flex flex-col items-center justify-center h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">🔔</span>
            <span>Alerts</span>
          </button>
        </div>

        {/* Personal Timetable & Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="card-title">Today's Classes</h3>
                    <p className="card-description">Monday, March 18, 2024</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs px-3 py-2">
                      <span className="mr-1">📅</span>
                      Sync Calendar
                    </button>
                    <button className="btn-secondary text-xs px-3 py-2">
                      <span className="mr-1">🔄</span>
                      Request Swap
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { time: '09:00 - 10:30', subject: 'Data Structures', room: 'Lab 3', students: 45, type: 'practical' },
                  { time: '11:00 - 12:30', subject: 'Algorithm Design', room: 'Room 205', students: 38, type: 'lecture' },
                  { time: '14:00 - 15:30', subject: 'Database Systems', room: 'Room 301', students: 42, type: 'lecture' },
                ].map((class_, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1a73e8] dark:bg-[#1a73e8] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-lg text-white">{class_.type === 'practical' ? '💻' : '📖'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200">{class_.subject}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{class_.time} • {class_.room}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">{class_.students} students</p>
                        <span className="badge badge-success text-xs">{class_.type}</span>
                      </div>
                      <div className="flex gap-1">
                        <button className="btn-ghost text-xs px-2 py-1">View</button>
                        <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Management */}
            <div className="card mt-4 md:mt-6">
              <div className="card-header">
                <h3 className="card-title">Course Management</h3>
                <p className="card-description">Syllabus, attendance, and materials</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { course: 'Data Structures', progress: 65, students: 45, materials: 12 },
                  { course: 'Algorithm Design', progress: 45, students: 38, materials: 8 },
                  { course: 'Database Systems', progress: 80, students: 42, materials: 15 }
                ].map((course, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">{course.course}</h4>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                      <div className="bg-[#1a73e8] dark:bg-[#1a73e8] h-1.5 rounded-full transition-all duration-300" style={{width: `${course.progress}%`}}></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{course.students} students</span>
                      <span>{course.materials} materials</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {/* Preference Profiles */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Preference Profiles</h3>
                <p className="card-description">Quick profile switching</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Standard Teaching</span>
                  </div>
                  <span className="badge badge-success text-xs">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Research Semester</span>
                  </div>
                  <button className="text-xs text-[#1a73e8] dark:text-[#1a73e8] hover:underline">Apply</button>
                </div>
                <button className="btn-secondary w-full text-xs py-2">
                  ➕ Create New Profile
                </button>
              </div>
            </div>

            {/* Student Performance Overview */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Student Analytics</h3>
                <p className="card-description">Performance overview</p>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Data Structures</span>
                    <span className="text-xs text-[#34a853]">87% avg</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Attendance: 92%</span>
                    <span>45 students</span>
                  </div>
                </div>
                <button className="btn-secondary w-full text-xs py-2">
                  📈 Detailed Analytics
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Notifications</h3>
                <p className="card-description">Recent updates and alerts</p>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'info', message: 'Schedule updated for next week', time: '2h ago', priority: 'normal' },
                  { type: 'warning', message: 'Room change for Database class', time: '4h ago', priority: 'high' },
                  { type: 'success', message: 'Swap request approved', time: '1d ago', priority: 'normal' },
                ].map((notification, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-[#3c4043] rounded text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      notification.type === 'success' ? 'bg-green-500' :
                      notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 leading-tight">{notification.message}</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-0.5">{notification.time}</p>
                    </div>
                    {notification.priority === 'high' && (
                      <span className="badge badge-danger text-xs flex-shrink-0">High</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}