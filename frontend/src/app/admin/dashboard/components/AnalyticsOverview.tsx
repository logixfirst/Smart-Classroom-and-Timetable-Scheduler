export default function AnalyticsOverview() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base lg:text-lg">Utilization Reports</h3>
        <p className="card-description text-xs sm:text-sm">Resource usage analytics</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-300 font-medium">Classroom Usage</span>
          <span className="font-bold text-emerald-400">87%</span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full shadow-lg shadow-emerald-500/25" style={{width: '87%'}}></div>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-300 font-medium">Faculty Load</span>
          <span className="font-bold text-amber-400">73%</span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-3 rounded-full shadow-lg shadow-amber-500/25" style={{width: '73%'}}></div>
        </div>
      </div>
    </div>
  )
}