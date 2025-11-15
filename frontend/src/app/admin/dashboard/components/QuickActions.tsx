export default function QuickActions() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Strategic Actions</h3>
        <p className="card-description">Administrative control center</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button className="btn-primary flex flex-col items-center justify-center h-16 text-xs">
          <span className="text-lg mb-1">👤</span>
          <span>Add User</span>
        </button>
        <button className="btn-secondary flex flex-col items-center justify-center h-16 text-xs">
          <span className="text-lg mb-1">🔐</span>
          <span>Roles</span>
        </button>
        <button className="btn-secondary flex flex-col items-center justify-center h-16 text-xs">
          <span className="text-lg mb-1">📊</span>
          <span>Audit</span>
        </button>
        <button className="btn-secondary flex flex-col items-center justify-center h-16 text-xs">
          <span className="text-lg mb-1">⚙️</span>
          <span>Config</span>
        </button>
        <button className="btn-secondary flex flex-col items-center justify-center h-16 text-xs">
          <span className="text-lg mb-1">💾</span>
          <span>Backup</span>
        </button>
        <button className="btn-secondary flex flex-col items-center justify-center h-16 text-xs">
          <span className="text-lg mb-1">📈</span>
          <span>Reports</span>
        </button>
      </div>
    </div>
  )
}
