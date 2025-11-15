import DashboardLayout from '@/components/dashboard-layout'

export default function PreferencesPage() {
  return (
    <DashboardLayout role="faculty">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Teaching Preferences
          </h1>
          <button className="btn-primary w-full sm:w-auto">Save Preferences</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Time Preferences</h3>
              <p className="card-description">Set your preferred teaching hours</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="form-group">
                <label htmlFor="start-time" className="form-label text-sm sm:text-base">
                  Preferred Start Time
                </label>
                <select id="start-time" className="input-primary text-sm sm:text-base">
                  <option>08:00 AM</option>
                  <option>09:00 AM</option>
                  <option>10:00 AM</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="end-time" className="form-label text-sm sm:text-base">
                  Preferred End Time
                </label>
                <select id="end-time" className="input-primary text-sm sm:text-base">
                  <option>04:00 PM</option>
                  <option>05:00 PM</option>
                  <option>06:00 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-sm sm:text-base">Preferred Days</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <label
                      key={day}
                      htmlFor={`day-${day.toLowerCase()}`}
                      className="flex items-center gap-2"
                    >
                      <input
                        id={`day-${day.toLowerCase()}`}
                        type="checkbox"
                        className="rounded w-4 h-4"
                        defaultChecked={day !== 'Saturday'}
                      />
                      <span className="text-xs sm:text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Course Preferences</h3>
              <p className="card-description">Specify course and room preferences</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="form-group">
                <label htmlFor="max-classes" className="form-label text-sm sm:text-base">
                  Maximum Classes Per Day
                </label>
                <select id="max-classes" className="input-primary text-sm sm:text-base">
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="room-type" className="form-label text-sm sm:text-base">
                  Preferred Room Type
                </label>
                <select id="room-type" className="input-primary text-sm sm:text-base">
                  <option>Any</option>
                  <option>Lecture Hall</option>
                  <option>Laboratory</option>
                  <option>Seminar Room</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="break-time" className="form-label text-sm sm:text-base">
                  Break Between Classes
                </label>
                <select id="break-time" className="input-primary text-sm sm:text-base">
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Availability Calendar</h3>
            <p className="card-description">Mark your unavailable time slots</p>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center min-w-96">
              <div className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 p-1 sm:p-2">
                Time
              </div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 p-1 sm:p-2"
                >
                  {day}
                </div>
              ))}

              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map(
                time => (
                  <div key={time} className="contents">
                    <div className="p-1 sm:p-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {time}
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                      return (
                        <button
                          key={i}
                          aria-label={`Toggle availability for ${days[i]} at ${time}`}
                          className="p-1 sm:p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#3c4043] transition-colors"
                        >
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded mx-auto"></div>
                        </button>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
