'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function StaffAnalytics() {
  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Performance metrics and insights
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Classes</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">156</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">📚</span>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Efficiency Rate
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">94%</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">📈</span>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Conflicts Resolved
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">23</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">⚡</span>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Satisfaction</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">4.8</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                <span className="text-sm sm:text-lg">⭐</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Performance Trends</h3>
          </div>
          <div className="h-48 sm:h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            Chart placeholder - Analytics visualization would go here
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
