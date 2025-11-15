export default function AnalyticsOverview() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Utilization Reports</h3>
        <p className="card-description">Resource usage analytics</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Classroom Usage</span>
          <span className="font-semibold text-[#34a853]">87%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-[#34a853] h-2 rounded-full transition-all duration-300"
            style={{ width: '87%' }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Faculty Load</span>
          <span className="font-semibold text-[#fbbc05]">73%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-[#fbbc05] h-2 rounded-full transition-all duration-300"
            style={{ width: '73%' }}
          ></div>
        </div>
      </div>
    </div>
  )
}
