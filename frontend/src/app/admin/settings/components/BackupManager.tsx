export default function BackupManager() {
  const backups = [
    { date: '2024-03-18', time: '02:00 AM', size: '2.4 GB', status: 'Success' },
    { date: '2024-03-17', time: '02:00 AM', size: '2.3 GB', status: 'Success' },
    { date: '2024-03-16', time: '02:00 AM', size: '2.2 GB', status: 'Failed' },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="card-title text-base sm:text-lg">Backup & Restore</h3>
            <p className="card-description text-xs sm:text-sm">Manage system backups</p>
          </div>
          <button className="btn-primary w-full sm:w-auto text-sm sm:text-base">
            <span className="mr-2">💾</span>
            Create Backup
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {backups.map((backup, index) => (
          <div
            key={index}
            className="interactive-element flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 dark:border-[#3c4043]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{backup.date}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {backup.time} • {backup.size}
                  </p>
                </div>
                <span
                  className={`badge text-xs self-start sm:self-center ${
                    backup.status === 'Success' ? 'badge-success' : 'badge-danger'
                  }`}
                >
                  {backup.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="btn-ghost text-xs sm:text-sm px-2 sm:px-3 py-1 flex-1 sm:flex-none">
                Download
              </button>
              <button className="btn-ghost text-xs sm:text-sm px-2 sm:px-3 py-1 flex-1 sm:flex-none">
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
