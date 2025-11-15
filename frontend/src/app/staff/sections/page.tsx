import DashboardLayout from '@/components/dashboard-layout'

export default function SectionsPage() {
  const batches = [
    {
      id: 1,
      name: 'CS Semester 5',
      students: 120,
      sections: 3,
      maxPerSection: 40,
      status: 'active',
      practicals: 2,
    },
    {
      id: 2,
      name: 'EE Semester 3',
      students: 80,
      sections: 2,
      maxPerSection: 40,
      status: 'pending',
      practicals: 1,
    },
    {
      id: 3,
      name: 'ME Semester 4',
      students: 100,
      sections: 0,
      maxPerSection: 35,
      status: 'draft',
      practicals: 3,
    },
    {
      id: 4,
      name: 'IT Semester 6',
      students: 90,
      sections: 3,
      maxPerSection: 30,
      status: 'active',
      practicals: 2,
    },
  ]

  return (
    <DashboardLayout role="staff">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Batch & Section Management
          </h1>
          <button className="btn-primary w-full sm:w-auto">
            <span className="mr-2">➕</span>
            Create Section
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Total Batches
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">12</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">across departments</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Active Sections
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600">28</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">currently running</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Avg. Size
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">35</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">students per section</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-2">
              Pending Setup
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">3</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">need configuration</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="card-title text-sm sm:text-base">Batch Overview</h3>
                <p className="card-description text-xs sm:text-sm">
                  Manage student sections and practical groups
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="department-filter" className="sr-only">
                  Filter by department
                </label>
                <select id="department-filter" className="input-primary text-sm w-full sm:w-32">
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Electronics</option>
                  <option>Mechanical</option>
                </select>
                <button className="btn-secondary text-sm px-3 py-2">
                  <span className="mr-2">📊</span>
                  Analytics
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {batches.map(batch => (
              <div key={batch.id} className="p-3 sm:p-4 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <h4 className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                        {batch.name}
                      </h4>
                      <span
                        className={`badge text-xs self-start ${
                          batch.status === 'active'
                            ? 'badge-success'
                            : batch.status === 'pending'
                              ? 'badge-warning'
                              : 'badge-neutral'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2 bg-white dark:bg-[#2a2a2a] rounded">
                        <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">
                          {batch.students}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#2a2a2a] rounded">
                        <p className="text-sm sm:text-base font-bold text-blue-600">
                          {batch.sections}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sections</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#2a2a2a] rounded">
                        <p className="text-sm sm:text-base font-bold text-green-600">
                          {batch.maxPerSection}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Max/Section</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#2a2a2a] rounded">
                        <p className="text-sm sm:text-base font-bold text-purple-600">
                          {batch.practicals}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Practicals</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <button className="btn-ghost text-xs px-3 py-1.5 flex-1 lg:flex-none">
                      <span className="mr-1">👁️</span>
                      View
                    </button>
                    <button className="btn-secondary text-xs px-3 py-1.5 flex-1 lg:flex-none">
                      <span className="mr-1">✏️</span>
                      Edit
                    </button>
                    {batch.status === 'draft' && (
                      <button className="btn-primary text-xs px-3 py-1.5 flex-1 lg:flex-none">
                        <span className="mr-1">🚀</span>
                        Setup
                      </button>
                    )}
                  </div>
                </div>

                {batch.sections > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Section Distribution:</span>
                      <span>{Math.ceil(batch.students / batch.sections)} avg. per section</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1">
                      {Array.from({ length: batch.sections }).map((_, i) => (
                        <div key={i} className="h-2 bg-blue-200 dark:bg-blue-800 rounded"></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
