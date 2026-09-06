'use client'

import dynamic from 'next/dynamic'
import { ListSkeleton } from '@/components/LoadingSkeletons'
import type { TodayClass } from './types'

const ExportButton = dynamic(() => import('@/components/shared/ExportButton'), {
  ssr: false,
  loading: () => <button className="btn-primary text-xs px-3 py-2">&#x1F4E5; Export</button>,
})

interface Props {
  todaysClasses: TodayClass[]
  loading: boolean
}

export function TodaysClassesCard({ todaysClasses, loading }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="card-title">Today&apos;s Classes</h3>
            <p className="card-description">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs px-3 py-2">
              <span className="hidden sm:inline">Calendar View</span>
              <span className="sm:hidden">Calendar</span>
            </button>
            <ExportButton
              slots={todaysClasses.map(cls => ({
                day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                time_slot: cls.time,
                subject_name: cls.subject,
                faculty_name: cls.faculty,
                classroom_number: cls.room,
                batch_id: 'CS-A',
              }))}
              tableElementId="student-schedule-grid"
              options={{
                title: 'Student Timetable',
                department: 'Computer Science',
                batch: 'CS-A',
                semester: 5,
                academicYear: '2024-25',
              }}
              className="text-xs px-3 py-2"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <ListSkeleton items={3} />
      ) : todaysClasses.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
            No Classes Today
          </h3>
          <p className="text-gray-600 dark:text-gray-400">Enjoy your free day!</p>
        </div>
      ) : (
        <div id="student-schedule-grid" className="space-y-3">
          {todaysClasses.map((class_, index) => (
            <div
              key={index}
              className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                class_.status === 'current'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-gray-50 dark:bg-[#3c4043] border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h4 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200 truncate">
                      {class_.subject}
                    </h4>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      ({class_.code})
                    </span>
                    <span
                      className={`badge text-xs ${
                        class_.type === 'Lab'
                          ? 'badge-info'
                          : class_.type === 'Tutorial'
                            ? 'badge-warning'
                            : 'badge-neutral'
                      }`}
                    >
                      {class_.type}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {class_.faculty} &bull; {class_.room}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                  <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {class_.time}
                  </p>
                  <span
                    className={`badge text-xs ${
                      class_.status === 'current' ? 'badge-success' : 'badge-neutral'
                    }`}
                  >
                    {class_.status === 'current' ? 'In Progress' : 'Upcoming'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
