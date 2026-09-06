export function AssignmentsPanel() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base">Upcoming Assignments</h3>
        <p className="card-description text-xs sm:text-sm">Deadlines and submissions</p>
      </div>
      <div className="text-center py-8">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>Assignments data coming soon</p>
      </div>
    </div>
  )
}

export function NotificationsPanel() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base">Notifications</h3>
      </div>
      <div className="text-center py-8">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>No notifications yet</p>
      </div>
    </div>
  )
}

export function CourseMaterialsPanel() {
  return (
    <div className="card lg:col-span-2 xl:col-span-1">
      <div className="card-header">
        <h3 className="card-title text-sm sm:text-base">Course Materials &amp; Feedback</h3>
      </div>
      <div className="text-center py-8">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>Course materials coming soon</p>
      </div>
    </div>
  )
}
