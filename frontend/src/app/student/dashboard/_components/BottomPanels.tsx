export function AssignmentsPanel() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base">Upcoming Assignments</h3>
        <p className="card-description text-xs sm:text-sm">Deadlines and submissions</p>
      </div>
      <div className="space-y-3">
        {[
          { title: 'Database Design Project', subject: 'Database Systems', code: 'CS302', due: 'March 22, 2024', priority: 'high', submitted: false },
          { title: 'Algorithm Analysis Report', subject: 'Data Structures', code: 'CS301', due: 'March 25, 2024', priority: 'medium', submitted: false },
          { title: 'Software Requirements Document', subject: 'Software Engineering', code: 'CS303', due: 'March 28, 2024', priority: 'low', submitted: true },
          { title: 'ML Model Implementation', subject: 'Machine Learning', code: 'CS401', due: 'April 5, 2024', priority: 'medium', submitted: false },
        ].map((assignment, index) => (
          <div key={index} className="p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                assignment.submitted ? 'bg-green-500' : assignment.priority === 'high' ? 'bg-red-500' : assignment.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{assignment.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{assignment.subject} ({assignment.code})</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Due: {assignment.due}</p>
                  <span className={`badge text-xs ${assignment.submitted ? 'badge-success' : 'badge-warning'}`}>
                    {assignment.submitted ? 'Submitted' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NotificationsPanel() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base">Notifications</h3>
      </div>
      <div className="space-y-3">
        {[
          { type: 'announcement', message: 'Mid-semester exam schedule released', time: '2h ago', priority: 'high' },
          { type: 'grade', message: 'Grade updated for Database Systems Quiz', time: '1d ago', priority: 'medium' },
          { type: 'event', message: 'Technical fest registration open', time: '2d ago', priority: 'low' },
          { type: 'alert', message: 'Class cancelled: Software Engineering Lab', time: '3h ago', priority: 'high' },
          { type: 'material', message: 'New lecture notes uploaded for ML', time: '1d ago', priority: 'medium' },
        ].map((notification, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border-l-4 ${
              notification.priority === 'high'
                ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                : notification.priority === 'medium'
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500'
                  : 'bg-gray-50 dark:bg-[#3c4043] border-gray-300 dark:border-gray-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-sm flex-shrink-0">
                {notification.type === 'announcement' ? '\u{1F4E2}' : notification.type === 'grade' ? '\u{1F4CA}' : notification.type === 'alert' ? '\u26A0\uFE0F' : notification.type === 'material' ? '\u{1F4DA}' : '\u{1F389}'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{notification.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CourseMaterialsPanel() {
  return (
    <div className="card lg:col-span-2 xl:col-span-1">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base">Course Materials &amp; Feedback</h3>
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Recent Materials</h4>
          <div className="space-y-2">
            {[
              { title: 'Database Normalization Notes', course: 'CS302', type: 'PDF', size: '2.4 MB' },
              { title: 'Algorithm Complexity Slides', course: 'CS301', type: 'PPT', size: '5.1 MB' },
              { title: 'Software Testing Guidelines', course: 'CS303', type: 'DOC', size: '1.8 MB' },
            ].map((material, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                <div className="text-sm flex-shrink-0">
                  {material.type === 'PDF' ? '\u{1F4DD}' : material.type === 'PPT' ? '\u{1F4CA}' : '\u{1F4C4}'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{material.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{material.course} &bull; {material.size}</p>
                </div>
                <button className="btn-secondary text-xs px-2 py-1 h-6 flex-shrink-0">Download</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Anonymous Feedback</h4>
          <div className="space-y-2">
            <button className="w-full p-3 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg text-left hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm">\u{1F4AC}</span>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-primary-700 dark:text-primary-300">Course Scheduling Feedback</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400">Share your thoughts on timetable conflicts</p>
                </div>
              </div>
            </button>
            <button className="w-full p-3 bg-gray-50 dark:bg-[#3c4043] border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-[#f5f5f5] dark:hover:bg-[#5f6368] transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm">\u2605</span>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">Faculty Performance</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Rate teaching quality and methods</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
