interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
  facultyId?: number
  isConflicted?: boolean
}

interface Faculty {
  id: number
  name: string
  isAvailable: boolean
  subjects: string[]
}

interface TimetableGridProps {
  schedule: TimeSlot[]
  className?: string
  isAdminView?: boolean
  onSlotClick?: (slot: TimeSlot) => void
}

export default function TimetableGrid({
  schedule,
  className = '',
  isAdminView = false,
  onSlotClick,
}: TimetableGridProps) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const times = [
    '9:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-13:00',
    '14:00-15:00',
    '15:00-16:00',
    '16:00-17:00',
  ]

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-4">
        {days.map(day => {
          const daySlots = schedule.filter(s => s.day === day)
          if (daySlots.length === 0) return null

          return (
            <div key={day} className="card">
              <div className="card-header">
                <h3 className="card-title capitalize">{day}</h3>
              </div>
              <div className="space-y-2">
                {daySlots.map((slot, index) => {
                  const isConflicted = slot.isConflicted
                  const bgColor = isConflicted
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                  const borderColor = isConflicted
                    ? 'border-red-200 dark:border-red-800'
                    : 'border-blue-200 dark:border-blue-800'
                  const textColor = isConflicted
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-blue-800 dark:text-blue-300'

                  return (
                    <div
                      key={index}
                      className={`${bgColor} p-3 rounded-lg border ${borderColor} ${isAdminView && isConflicted ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity duration-200`}
                      onClick={() =>
                        isAdminView && isConflicted && onSlotClick && onSlotClick(slot)
                      }
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-xs font-medium ${textColor} bg-opacity-40 px-2 py-1 rounded`}
                        >
                          {slot.time}
                        </span>
                        {isConflicted && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">
                            Conflict
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div
                          className={`font-medium text-sm ${isConflicted ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'}`}
                        >
                          {slot.subject}
                        </div>
                        <div
                          className={`text-xs ${isConflicted ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}
                        >
                          {slot.faculty}
                        </div>
                        <div
                          className={`text-xs ${isConflicted ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                          {slot.classroom} • {slot.batch}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="table text-xs sm:text-sm lg:text-base min-w-full">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell w-20 sm:w-24 lg:w-32">Time</th>
              {days.map(day => (
                <th
                  key={day}
                  className="table-header-cell capitalize min-w-[120px] sm:min-w-[140px] lg:min-w-[160px]"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time} className="table-row">
                <td className="table-cell font-medium whitespace-nowrap align-top">
                  <div className="text-xs sm:text-sm lg:text-base py-1">{time}</div>
                </td>
                {days.map(day => {
                  const slot = schedule.find(s => s.day === day && s.time === time)
                  return (
                    <td key={`${day}-${time}`} className="table-cell align-top p-1 sm:p-2 lg:p-3">
                      {slot &&
                        (() => {
                          const isConflicted = slot.isConflicted
                          const bgColor = isConflicted
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                          const borderColor = isConflicted
                            ? 'border-red-200 dark:border-red-700'
                            : 'border-blue-200 dark:border-blue-700'
                          const hoverColor = isConflicted
                            ? 'hover:bg-red-200 dark:hover:bg-red-900/40'
                            : 'hover:bg-blue-200 dark:hover:bg-blue-900/40'

                          return (
                            <div
                              className={`${bgColor} p-1 sm:p-2 lg:p-3 rounded-lg text-xs sm:text-sm border ${borderColor} ${hoverColor} transition-colors duration-200 ${isAdminView && isConflicted ? 'cursor-pointer' : ''} relative`}
                              onClick={() =>
                                isAdminView && isConflicted && onSlotClick && onSlotClick(slot)
                              }
                            >
                              {isConflicted && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                              )}
                              <div
                                className={`font-medium mb-1 truncate ${isConflicted ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'}`}
                              >
                                {slot.subject}
                              </div>
                              <div
                                className={`mb-1 truncate ${isConflicted ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}
                              >
                                {slot.faculty}
                              </div>
                              <div
                                className={`text-xs truncate ${isConflicted ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}
                              >
                                {slot.classroom} • {slot.batch}
                              </div>
                            </div>
                          )
                        })()}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
