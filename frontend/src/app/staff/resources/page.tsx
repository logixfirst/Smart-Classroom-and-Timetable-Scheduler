import DashboardLayout from '@/components/dashboard-layout'

export default function ResourcesPage() {
  const bookings = [
    {
      id: 1,
      resource: 'Auditorium',
      bookedBy: 'Dr. Smith',
      date: '2024-03-20',
      time: '10:00-12:00',
      purpose: 'Guest Lecture',
      status: 'confirmed',
    },
    {
      id: 2,
      resource: 'Lab 3',
      bookedBy: 'Prof. Johnson',
      date: '2024-03-21',
      time: '14:00-16:00',
      purpose: 'Workshop',
      status: 'pending',
    },
    {
      id: 3,
      resource: 'Seminar Hall A',
      bookedBy: 'Dr. Brown',
      date: '2024-03-22',
      time: '09:00-11:00',
      purpose: 'Conference',
      status: 'confirmed',
    },
  ]

  return (
    <DashboardLayout role="staff">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Resource Booking
          </h1>
          <button className="btn-primary w-full sm:w-auto">
            <span className="mr-2">📅</span>
            New Booking
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Available Today
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600">8</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">rooms available</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Pending Requests
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">3</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">awaiting approval</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              This Week
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">15</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">total bookings</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Utilization
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">73%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">average usage</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Bookings</h3>
            <p className="card-description">Manage resource reservations</p>
          </div>

          <div className="space-y-3">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-[#3c4043] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                    {booking.resource}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {booking.purpose} • {booking.bookedBy}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {booking.date} • {booking.time}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span
                    className={`badge text-xs ${
                      booking.status === 'confirmed' ? 'badge-success' : 'badge-warning'
                    }`}
                  >
                    {booking.status}
                  </span>
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                    <button className="btn-ghost text-xs px-2 py-1 text-red-600">Cancel</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
