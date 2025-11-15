'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function StudentNotifications() {
  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Notifications
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Stay updated with important announcements
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-secondary flex-1 sm:flex-none">
              <span className="mr-2">✅</span>
              Mark All Read
            </button>
            <button className="btn-primary flex-1 sm:flex-none">
              <span className="mr-2">⚙️</span>
              Settings
            </button>
          </div>
        </div>

        {/* Notification Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Unread
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">8</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-base">🔔</span>
              </div>
            </div>
          </div>
          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">12</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-base">📅</span>
              </div>
            </div>
          </div>
          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Week
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">45</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-base">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="card">
          <div className="space-y-3">
            {[
              {
                type: 'urgent',
                title: 'Class Cancelled - Database Systems',
                message:
                  "Tomorrow's Database Systems class has been cancelled due to faculty unavailability.",
                time: '2 hours ago',
                read: false,
                from: 'Prof. Meera Sharma',
              },
              {
                type: 'grade',
                title: 'Grade Updated - Data Structures Quiz',
                message:
                  'Your grade for Data Structures Quiz 2 has been updated. Check your performance.',
                time: '4 hours ago',
                read: false,
                from: 'Dr. Rajesh Kumar',
              },
              {
                type: 'announcement',
                title: 'Mid-Semester Exam Schedule Released',
                message:
                  'The mid-semester examination schedule for all courses has been published.',
                time: '1 day ago',
                read: true,
                from: 'Academic Office',
              },
              {
                type: 'assignment',
                title: 'New Assignment - Software Engineering',
                message:
                  'A new assignment on Software Requirements has been posted. Due date: March 25, 2024.',
                time: '1 day ago',
                read: false,
                from: 'Dr. Vikram Gupta',
              },
              {
                type: 'event',
                title: 'Technical Fest Registration Open',
                message:
                  'Registration for the annual technical fest TechnoVision 2024 is now open.',
                time: '2 days ago',
                read: true,
                from: 'Student Activities',
              },
              {
                type: 'material',
                title: 'New Study Material - Machine Learning',
                message:
                  'New lecture notes and reference materials have been uploaded for ML course.',
                time: '3 days ago',
                read: true,
                from: 'Dr. Anita Verma',
              },
            ].map((notification, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  notification.type === 'urgent'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                    : notification.type === 'grade'
                      ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'
                      : notification.type === 'assignment'
                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500'
                        : notification.type === 'event'
                          ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500'
                          : notification.type === 'material'
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                            : 'bg-gray-50 dark:bg-[#3c4043] border-gray-300 dark:border-gray-600'
                } ${!notification.read ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-lg flex-shrink-0 mt-1">
                      {notification.type === 'urgent'
                        ? '🚨'
                        : notification.type === 'grade'
                          ? '📊'
                          : notification.type === 'assignment'
                            ? '📝'
                            : notification.type === 'event'
                              ? '🎉'
                              : notification.type === 'material'
                                ? '📚'
                                : '📢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>From: {notification.from}</span>
                        <span>{notification.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button className="btn-ghost text-xs px-2 py-1">Mark Read</button>
                    )}
                    <button className="btn-ghost text-xs px-2 py-1">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Notification Preferences</h3>
            <p className="card-description">Customize what notifications you receive</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                category: 'Grade Updates',
                description: 'Get notified when grades are posted',
                enabled: true,
              },
              {
                category: 'Assignment Reminders',
                description: 'Reminders for upcoming deadlines',
                enabled: true,
              },
              {
                category: 'Class Cancellations',
                description: 'Urgent notifications about class changes',
                enabled: true,
              },
              {
                category: 'Event Announcements',
                description: 'Campus events and activities',
                enabled: false,
              },
              {
                category: 'Material Updates',
                description: 'New study materials and resources',
                enabled: true,
              },
              {
                category: 'Exam Schedules',
                description: 'Examination timetables and updates',
                enabled: true,
              },
            ].map((pref, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                    {pref.category}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {pref.description}
                  </p>
                </div>
                <button
                  className={`btn-secondary text-xs px-3 py-1 ${pref.enabled ? 'bg-green-100 text-green-700' : ''}`}
                >
                  {pref.enabled ? 'On' : 'Off'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
