'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function AdminNotifications() {
  return (
    <DashboardLayout
      role="admin"
      pageTitle="Notifications"
      pageDescription="System alerts and updates"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="flex-1"></div>
          <button className="btn-secondary">
            <span className="mr-2">✅</span>Mark All Read
          </button>
        </div>

        <div className="card">
          <div className="space-y-3">
            {[
              {
                type: 'urgent',
                title: 'System Maintenance Required',
                message: 'Database backup scheduled for tonight at 2 AM',
                time: '1 hour ago',
                read: false,
              },
              {
                type: 'approval',
                title: 'Pending Timetable Approvals',
                message: '5 timetables awaiting your approval',
                time: '3 hours ago',
                read: false,
              },
              {
                type: 'user',
                title: 'New Faculty Registration',
                message: 'Dr. Amit Patel has registered and needs verification',
                time: '5 hours ago',
                read: true,
              },
            ].map((notification, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  notification.type === 'urgent'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                    : notification.type === 'approval'
                      ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500'
                      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'
                } ${!notification.read ? 'ring-2 ring-blue-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-lg">
                      {notification.type === 'urgent'
                        ? '🚨'
                        : notification.type === 'approval'
                          ? '✅'
                          : '👤'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-gray-500">{notification.time}</span>
                    </div>
                  </div>
                  {!notification.read && (
                    <button className="btn-ghost text-xs px-2 py-1">Mark Read</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
