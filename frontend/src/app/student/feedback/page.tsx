import DashboardLayout from '@/components/dashboard-layout'

export default function FeedbackPage() {
  const feedbackHistory = [
    {
      id: 1,
      subject: 'Timetable Clash Issue',
      category: 'Schedule',
      date: '2024-03-15',
      status: 'resolved',
    },
    {
      id: 2,
      subject: 'Room Change Request',
      category: 'Facilities',
      date: '2024-03-10',
      status: 'pending',
    },
    {
      id: 3,
      subject: 'Course Timing Suggestion',
      category: 'Schedule',
      date: '2024-03-05',
      status: 'reviewed',
    },
  ]

  return (
    <DashboardLayout role="student">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Feedback & Suggestions
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Submit Feedback</h3>
              <p className="card-description">Help us improve the timetable system</p>
            </div>

            <form className="space-y-3 sm:space-y-4">
              <div className="form-group">
                <label htmlFor="category" className="form-label text-sm sm:text-base">
                  Category
                </label>
                <select id="category" className="input-primary text-sm sm:text-base">
                  <option>Schedule Issues</option>
                  <option>Room Facilities</option>
                  <option>Course Timing</option>
                  <option>System Bug</option>
                  <option>Feature Request</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label text-sm sm:text-base">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  className="input-primary text-sm sm:text-base"
                  placeholder="Brief description of your feedback"
                />
              </div>

              <div className="form-group">
                <label htmlFor="details" className="form-label text-sm sm:text-base">
                  Details
                </label>
                <textarea
                  id="details"
                  className="input-primary min-h-20 sm:min-h-24 text-sm sm:text-base"
                  placeholder="Provide detailed feedback or suggestions"
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="priority" className="form-label text-sm sm:text-base">
                  Priority
                </label>
                <select id="priority" className="input-primary text-sm sm:text-base">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="anonymous" className="flex items-center gap-2">
                  <input id="anonymous" type="checkbox" className="rounded w-4 h-4" />
                  <span className="text-xs sm:text-sm">Submit anonymously</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary w-full text-sm sm:text-base py-2.5 sm:py-3"
              >
                Submit Feedback
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Feedback</h3>
              <p className="card-description">Rate common aspects</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {[
                { aspect: 'Timetable Clarity', rating: 4 },
                { aspect: 'Schedule Convenience', rating: 3 },
                { aspect: 'Room Allocation', rating: 5 },
                { aspect: 'Break Timing', rating: 4 },
                { aspect: 'Overall Satisfaction', rating: 4 },
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {item.aspect}
                    </span>
                    <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          className={`text-sm sm:text-lg ${star <= item.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn-secondary w-full mt-3 sm:mt-4 text-sm sm:text-base py-2 sm:py-2.5">
                Update Ratings
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Feedback History</h3>
            <p className="card-description">Track your submitted feedback</p>
          </div>

          <div className="space-y-3">
            {feedbackHistory.map(feedback => (
              <div
                key={feedback.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-[#3c4043] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                    {feedback.subject}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {feedback.category} • {feedback.date}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span
                    className={`badge text-xs ${
                      feedback.status === 'resolved'
                        ? 'badge-success'
                        : feedback.status === 'pending'
                          ? 'badge-warning'
                          : 'badge-neutral'
                    }`}
                  >
                    {feedback.status}
                  </span>
                  <button className="btn-ghost text-xs px-2 py-1">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
