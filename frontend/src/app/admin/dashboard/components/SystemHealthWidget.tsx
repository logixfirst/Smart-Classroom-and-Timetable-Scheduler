export default function SystemHealthWidget() {
  return (
    <div className="card hover:shadow-emerald-500/20">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-300">System Health</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400 truncate">98%</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg sm:text-xl">❤️</span>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
        <span className="text-emerald-400 font-semibold">All services online</span>
      </div>
    </div>
  )
}