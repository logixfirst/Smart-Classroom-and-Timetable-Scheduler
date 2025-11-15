export default function SystemHealthWidget() {
  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</p>
          <p className="text-2xl lg:text-3xl font-semibold text-[#34a853] truncate">98%</p>
        </div>
        <div className="w-12 h-12 bg-[#34a853] rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl text-white">❤️</span>
        </div>
      </div>
      <div className="mt-3 flex items-center text-sm">
        <span className="text-[#34a853] font-medium">All services online</span>
      </div>
    </div>
  )
}
