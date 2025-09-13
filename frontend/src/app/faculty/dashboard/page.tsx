"use client"

import DashboardLayout from '@/components/dashboard-layout'

export default function FacultyDashboard() {
  return (
    <DashboardLayout role="faculty">
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-8 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl lg:text-3xl font-bold text-white">
                Welcome back, Dr. Rajesh Kumar
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-2">
                Computer Science Department • Today's overview
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button className="btn-primary text-sm sm:text-base px-6 py-3 shadow-lg shadow-indigo-500/25">
                📅 View Schedule
              </button>
              <button className="btn-secondary text-sm sm:text-base px-6 py-3">
                ⚙️ Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3 lg:gap-4">
          <button className="bg-indigo-600/80 hover:bg-indigo-600 backdrop-blur-sm border border-indigo-500/50 rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 flex flex-col items-center justify-center h-16 sm:h-20 text-xs font-semibold text-white">
            <span className="text-lg sm:text-2xl mb-1">📅</span>
            <span>Schedule</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">👥</span>
            <span>Students</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">💬</span>
            <span>Announce</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">🔧</span>
            <span>Resources</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">📊</span>
            <span>Analytics</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">⚙️</span>
            <span>Profiles</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">🔄</span>
            <span>Swap</span>
          </button>
          <button className="btn-secondary justify-center flex-col h-16 sm:h-20 text-xs">
            <span className="text-lg sm:text-2xl mb-1">🔔</span>
            <span>Alerts</span>
          </button>
        </div>

        {/* Personal Timetable & Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-slate-700/50 shadow-2xl hover:bg-black/30 hover:border-slate-600 transition-all duration-300 ease-in-out">
              <div className="pb-4 border-b border-slate-600/50 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg lg:text-2xl font-bold text-white">Today's Classes</h3>
                    <p className="text-sm text-slate-300 mt-1">Monday, March 18, 2024</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-slate-500/20 hover:bg-slate-500/40 backdrop-blur-sm border border-slate-700 rounded-lg shadow-lg transition-all duration-300 ease-in-out text-xs px-3 py-2 text-white">
                      <span className="mr-1">📅</span>
                      Sync Calendar
                    </button>
                    <button className="bg-slate-500/20 hover:bg-slate-500/40 backdrop-blur-sm border border-slate-700 rounded-lg shadow-lg transition-all duration-300 ease-in-out text-xs px-3 py-2 text-white">
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
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-slate-500/10 backdrop-blur-sm border border-slate-600/30 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600/30 backdrop-blur-sm border border-indigo-500/50 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
                        <span className="text-lg">{class_.type === 'practical' ? '💻' : '📖'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-white">{class_.subject}</h4>
                        <p className="text-xs sm:text-sm text-slate-300">{class_.time} • {class_.room}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm font-semibold text-white">{class_.students} students</p>
                        <span className="px-2 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 rounded-full backdrop-blur-sm">{class_.type}</span>
                      </div>
                      <div className="flex gap-1">
                        <button className="bg-slate-500/20 hover:bg-slate-500/40 backdrop-blur-sm border border-slate-700 rounded-lg transition-all duration-300 ease-in-out text-xs px-2 py-1 text-white">View</button>
                        <button className="bg-slate-500/20 hover:bg-slate-500/40 backdrop-blur-sm border border-slate-700 rounded-lg transition-all duration-300 ease-in-out text-xs px-2 py-1 text-white">Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Management */}
            <div className="card mt-4 sm:mt-6">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Course Management</h3>
                <p className="card-description text-xs sm:text-sm">Syllabus, attendance, and materials</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { course: 'Data Structures', progress: 65, students: 45, materials: 12 },
                  { course: 'Algorithm Design', progress: 45, students: 38, materials: 8 },
                  { course: 'Database Systems', progress: 80, students: 42, materials: 15 }
                ].map((course, index) => (
                  <div key={index} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{course.course}</h4>
                      <span className="text-xs text-neutral-500">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mb-2">
                      <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{width: `${course.progress}%`}}></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                      <span>{course.students} students</span>
                      <span>{course.materials} materials</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Preference Profiles */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Preference Profiles</h3>
                <p className="card-description text-xs sm:text-sm">Quick profile switching</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs sm:text-sm font-medium">Standard Teaching</span>
                  </div>
                  <span className="badge badge-success text-xs">Active</span>
                </div>
                <div className="flex items-center justify-between p-2 sm:p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs sm:text-sm font-medium">Research Semester</span>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Apply</button>
                </div>
                <div className="flex items-center justify-between p-2 sm:p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs sm:text-sm font-medium">Conference Season</span>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Apply</button>
                </div>
                <button className="btn-secondary w-full text-xs sm:text-sm py-2">
                  ➕ Create New Profile
                </button>
              </div>
            </div>

            {/* Student Performance Overview */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Student Analytics</h3>
                <p className="card-description text-xs sm:text-sm">Performance overview</p>
              </div>
              <div className="space-y-2">
                <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200">Data Structures</span>
                    <span className="text-xs text-green-600">87% avg</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-green-700 dark:text-green-300">
                    <span>Attendance: 92%</span>
                    <span>45 students</span>
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200">Algorithm Design</span>
                    <span className="text-xs text-yellow-600">74% avg</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-yellow-700 dark:text-yellow-300">
                    <span>Attendance: 78%</span>
                    <span>38 students</span>
                  </div>
                </div>
                <button className="btn-secondary w-full text-xs sm:text-sm py-2">
                  📈 Detailed Analytics
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Notifications</h3>
                <p className="card-description text-xs sm:text-sm">Recent updates and alerts</p>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'info', message: 'Schedule updated for next week', time: '2h ago', priority: 'normal' },
                  { type: 'warning', message: 'Room change for Database class', time: '4h ago', priority: 'high' },
                  { type: 'success', message: 'Swap request approved', time: '1d ago', priority: 'normal' },
                  { type: 'info', message: 'New syllabus uploaded', time: '2d ago', priority: 'low' }
                ].map((notification, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      notification.type === 'success' ? 'bg-green-500' :
                      notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 leading-tight">{notification.message}</p>
                      <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">{notification.time}</p>
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

        {/* Communication & Resource Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm sm:text-base">Direct Communication</h3>
              <p className="card-description text-xs sm:text-sm">Send announcements to students</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">Quick Announcement</h4>
                  <span className="text-xs text-blue-600">All Classes</span>
                </div>
                <textarea className="w-full p-2 text-xs border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-neutral-800" rows={2} placeholder="Type your message..."></textarea>
                <div className="flex gap-2 mt-2">
                  <button className="btn-primary text-xs px-3 py-1 flex-1">Send to All</button>
                  <button className="btn-secondary text-xs px-3 py-1 flex-1">Select Classes</button>
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-sm text-green-900 dark:text-green-100 mb-2">Recent Messages</h4>
                <div className="space-y-1">
                  <p className="text-xs text-green-800 dark:text-green-200">Class postponed - sent 2h ago</p>
                  <p className="text-xs text-green-800 dark:text-green-200">Assignment deadline - sent 1d ago</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm sm:text-base">Resource Requests</h3>
              <p className="card-description text-xs sm:text-sm">Request lab equipment & resources</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-sm text-purple-900 dark:text-purple-100 mb-2">Quick Request</h4>
                <select className="w-full p-2 text-xs border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-neutral-800 mb-2">
                  <option>Select Resource Type</option>
                  <option>Lab Equipment</option>
                  <option>Projector</option>
                  <option>Software License</option>
                  <option>Classroom Setup</option>
                </select>
                <textarea className="w-full p-2 text-xs border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-neutral-800" rows={2} placeholder="Describe your requirements..."></textarea>
                <button className="btn-primary w-full text-xs py-2 mt-2">
                  📤 Submit Request
                </button>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-sm text-yellow-900 dark:text-yellow-100 mb-2">Pending Requests</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-800 dark:text-yellow-200">Projector for Lab 3</span>
                    <span className="badge badge-warning text-xs">Pending</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-800 dark:text-yellow-200">MATLAB License</span>
                    <span className="badge badge-success text-xs">Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Enhanced Course Analytics */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-sm sm:text-base">Detailed Student Performance</h3>
            <p className="card-description text-xs sm:text-sm">Comprehensive analytics for your courses</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              { course: 'Data Structures', attendance: 92, avgGrade: 87, assignments: 8, students: 45, trend: 'up' },
              { course: 'Algorithm Design', attendance: 78, avgGrade: 74, assignments: 6, students: 38, trend: 'down' },
              { course: 'Database Systems', attendance: 85, avgGrade: 81, assignments: 7, students: 42, trend: 'up' }
            ].map((course, index) => (
              <div key={index} className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{course.course}</h4>
                  <span className={`text-xs ${
                    course.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {course.trend === 'up' ? '↗️' : '↘️'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-neutral-700 rounded">
                    <p className="text-lg font-bold text-blue-600">{course.attendance}%</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Attendance</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-neutral-700 rounded">
                    <p className="text-lg font-bold text-green-600">{course.avgGrade}%</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Avg Grade</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-neutral-700 rounded">
                    <p className="text-lg font-bold text-purple-600">{course.assignments}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Assignments</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-neutral-700 rounded">
                    <p className="text-lg font-bold text-orange-600">{course.students}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Students</p>
                  </div>
                </div>
                <button className="btn-secondary w-full text-xs mt-3 py-1.5">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-sm sm:text-base">Upcoming Events & Deadlines</h3>
            <p className="card-description text-xs sm:text-sm">Important dates and academic calendar</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { title: 'Faculty Meeting', date: 'March 20', time: '10:00 AM', type: 'meeting', priority: 'high' },
              { title: 'Grade Submission', date: 'March 25', time: '11:59 PM', type: 'deadline', priority: 'high' },
              { title: 'Semester Exams', date: 'March 30', time: 'All Day', type: 'exam', priority: 'medium' },
              { title: 'Course Review', date: 'April 5', time: '2:00 PM', type: 'meeting', priority: 'low' }
            ].map((event, index) => (
              <div key={index} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">
                    {event.type === 'meeting' ? '👥' : event.type === 'exam' ? '📝' : '⏰'}
                  </span>
                  <h4 className="font-medium text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">{event.title}</h4>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{event.date}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{event.time}</p>
                {event.priority === 'high' && (
                  <span className="badge badge-danger text-xs mt-1">Urgent</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}