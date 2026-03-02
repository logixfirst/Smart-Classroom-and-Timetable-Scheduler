export function ClashDetectionCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="card-title text-sm sm:text-base">Course Clash Detection</h3>
            <p className="card-description text-xs sm:text-sm">Check for scheduling conflicts in your course selection</p>
          </div>
          <button className="btn-primary text-xs sm:text-sm px-3 py-2 h-8 sm:h-10 w-full sm:w-auto">
            <span className="mr-1 sm:mr-2">\u{1F50D}</span>
            Run Clash Check
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Current Conflicts</h4>
          <div className="space-y-2">
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-sm flex-shrink-0">\u26A0\uFE0F</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Time Conflict Detected</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Machine Learning (CS401) overlaps with Web Development (CS402)</p>
                  <p className="text-xs text-red-500 dark:text-red-500">Monday 2:00-3:30 PM</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-sm flex-shrink-0">\u2713</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">No Conflicts</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Core courses are properly scheduled</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Alternative Options</h4>
          <div className="space-y-2">
            {[
              { course: 'Web Development', code: 'CS402', section: 'B', time: 'Tuesday 10:00-11:30 AM', available: true },
              { course: 'Machine Learning', code: 'CS401', section: 'C', time: 'Wednesday 2:00-3:30 PM', available: false },
              { course: 'Mobile App Development', code: 'CS403', section: 'A', time: 'Thursday 11:00-12:30 PM', available: true },
            ].map((option, index) => (
              <div
                key={index}
                className={`p-2 sm:p-3 rounded-lg border ${
                  option.available
                    ? 'bg-gray-50 dark:bg-[#3c4043] border-gray-200 dark:border-gray-700'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-600 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{option.course}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{option.code} Section {option.section}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.time}</p>
                  </div>
                  <span className={`badge text-xs ${option.available ? 'badge-success' : 'badge-neutral'}`}>
                    {option.available ? 'Available' : 'Full'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
