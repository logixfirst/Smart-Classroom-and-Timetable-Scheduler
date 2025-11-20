'use client'

import NEP2020TimetableForm from '@/components/ui/timetableform'

export default function CreateTimetablePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="card">
        <div className="p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
            NEP 2020 Timetable Generation
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Student-based flexible enrollment (Harvard-style, NEP 2020)
          </p>

          {/* Feature Description */}
          <div className="mt-4 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              🎓 NEP 2020 Mode Features
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>✅ Student-based individual enrollments</li>
              <li>✅ Cross-department electives support</li>
              <li>✅ Flexible course selection (Harvard-style)</li>
              <li>✅ No batch restrictions</li>
              <li>✅ Automatic conflict detection via student overlap</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timetable Form */}
      <NEP2020TimetableForm />
    </div>
  )
}
