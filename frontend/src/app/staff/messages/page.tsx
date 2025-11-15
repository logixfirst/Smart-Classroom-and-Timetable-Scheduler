import DashboardLayout from '@/components/dashboard-layout'

export default function MessagesPage() {
  const messages = [
    {
      id: 1,
      from: 'Dr. Smith (CS Dept)',
      subject: 'Lab 3 Booking Conflict',
      message:
        'There seems to be a double booking for Lab 3 on Friday 2-4 PM. Can we resolve this?',
      time: '2 hours ago',
      priority: 'high',
      type: 'conflict',
      unread: true,
    },
    {
      id: 2,
      from: 'Prof. Johnson (Math)',
      subject: 'Schedule Change Request',
      message:
        'Need to swap Tuesday and Thursday slots for Calculus II due to conference attendance.',
      time: '4 hours ago',
      priority: 'medium',
      type: 'request',
      unread: true,
    },
    {
      id: 3,
      from: 'Maintenance Team',
      subject: 'Auditorium AC Repair',
      message: 'AC repair scheduled for Monday 10 AM - 2 PM. Please block this slot.',
      time: '1 day ago',
      priority: 'high',
      type: 'maintenance',
      unread: false,
    },
    {
      id: 4,
      from: 'Admin Office',
      subject: 'New Faculty Onboarding',
      message: 'Dr. Wilson joins EE department next week. Please allocate teaching slots.',
      time: '2 days ago',
      priority: 'low',
      type: 'info',
      unread: false,
    },
  ]

  const departments = [
    'Computer Science',
    'Electronics',
    'Mathematics',
    'Physics',
    'Mechanical',
    'Admin Office',
    'Maintenance',
  ]

  return (
    <DashboardLayout role="staff">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Inter-Departmental Messages
          </h1>
          <button className="btn-primary w-full sm:w-auto text-sm sm:text-base">
            <span className="mr-2">✉️</span>
            New Message
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Unread
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-red-600">2</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">new messages</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              High Priority
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">2</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">urgent items</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Today
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">3</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">received today</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Response Rate
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600">94%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">avg response</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="card-title text-sm sm:text-base">Message Inbox</h3>
                    <p className="card-description text-xs sm:text-sm">
                      Communication hub for scheduling coordination
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="message-type-filter" className="sr-only">
                      Filter by message type
                    </label>
                    <select
                      id="message-type-filter"
                      className="input-primary text-sm w-full sm:w-32"
                    >
                      <option>All Types</option>
                      <option>Conflicts</option>
                      <option>Requests</option>
                      <option>Maintenance</option>
                      <option>Info</option>
                    </select>
                    <label htmlFor="priority-filter" className="sr-only">
                      Filter by priority
                    </label>
                    <select id="priority-filter" className="input-primary text-sm w-full sm:w-32">
                      <option>All Priority</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                      msg.type === 'conflict'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        : msg.type === 'request'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                          : msg.type === 'maintenance'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    } ${msg.unread ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {msg.unread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200 truncate">
                            {msg.subject}
                          </h4>
                          <span
                            className={`badge text-xs ${
                              msg.priority === 'high'
                                ? 'badge-danger'
                                : msg.priority === 'medium'
                                  ? 'badge-warning'
                                  : 'badge-neutral'
                            }`}
                          >
                            {msg.priority}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {msg.from}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {msg.time}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {msg.message}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button className="btn-primary text-xs px-3 py-1.5 flex-1 sm:flex-none">
                        Reply
                      </button>
                      <button className="btn-secondary text-xs px-3 py-1.5 flex-1 sm:flex-none">
                        Forward
                      </button>
                      <button className="btn-ghost text-xs px-3 py-1.5 flex-1 sm:flex-none">
                        Mark Read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Quick Message</h3>
                <p className="card-description text-xs sm:text-sm">Send urgent notifications</p>
              </div>

              <form className="space-y-3">
                <div className="form-group">
                  <label htmlFor="to-department" className="form-label text-sm">
                    To Department
                  </label>
                  <select id="to-department" className="input-primary text-sm">
                    {departments.map(dept => (
                      <option key={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message-priority" className="form-label text-sm">
                    Priority
                  </label>
                  <select id="message-priority" className="input-primary text-sm">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message-subject" className="form-label text-sm">
                    Subject
                  </label>
                  <input
                    id="message-subject"
                    type="text"
                    className="input-primary text-sm"
                    placeholder="Message subject"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message-content" className="form-label text-sm">
                    Message
                  </label>
                  <textarea
                    id="message-content"
                    className="input-primary min-h-20 text-sm"
                    placeholder="Type your message..."
                  ></textarea>
                </div>

                <button type="submit" className="btn-primary w-full text-sm py-2">
                  Send Message
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm sm:text-base">Quick Actions</h3>
              </div>

              <div className="space-y-2">
                <button className="w-full text-left p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#5f6368] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🚨</span>
                    <span className="text-xs sm:text-sm font-medium">Report Conflict</span>
                  </div>
                </button>
                <button className="w-full text-left p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#5f6368] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔧</span>
                    <span className="text-xs sm:text-sm font-medium">Maintenance Alert</span>
                  </div>
                </button>
                <button className="w-full text-left p-2 sm:p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#5f6368] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📅</span>
                    <span className="text-xs sm:text-sm font-medium">Schedule Change</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
