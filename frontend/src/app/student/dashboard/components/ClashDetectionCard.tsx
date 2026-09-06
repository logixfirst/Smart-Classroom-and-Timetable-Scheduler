export function ClashDetectionCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="card-title text-sm sm:text-base">Course Clash Detection</h3>
            <p className="card-description text-xs sm:text-sm">Check for scheduling conflicts in your course selection</p>
          </div>
          <button className="btn-primary text-xs sm:text-sm px-3 py-2 h-8 sm:h-10 w-full sm:w-auto" disabled>
            Coming Soon
          </button>
        </div>
      </div>
      <div className="text-center py-12">
        <p className="font-medium mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>Clash Detection</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>This feature is coming soon. Your course schedule is automatically checked against the approved timetable.</p>
      </div>
    </div>
  )
}
