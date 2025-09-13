export default function QuickActions() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Strategic Actions</h3>
        <p className="card-description">Administrative control center</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button className="flex flex-col items-center justify-center p-3 h-16 text-xs font-medium text-white bg-indigo-600/50 hover:bg-indigo-600/80 backdrop-blur-sm border border-indigo-500/50 rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all duration-300">
          <span className="text-lg mb-1">👤</span>
          <span>Add User</span>
        </button>
        <button className="btn-secondary flex-col h-16">
          <span className="text-lg mb-1">🔐</span>
          <span>Roles</span>
        </button>
        <button className="btn-secondary flex-col h-16">
          <span className="text-lg mb-1">📊</span>
          <span>Audit</span>
        </button>
        <button className="btn-secondary flex-col h-16">
          <span className="text-lg mb-1">⚙️</span>
          <span>Config</span>
        </button>
        <button className="btn-secondary flex-col h-16">
          <span className="text-lg mb-1">💾</span>
          <span>Backup</span>
        </button>
        <button className="btn-secondary flex-col h-16">
          <span className="text-lg mb-1">📈</span>
          <span>Reports</span>
        </button>
      </div>
    </div>
  )
}