/**
 * AuditAndConfigPanel — combines four informational sections:
 *   • Audit Trail + Role Management   (2-col row)
 *   • System Config + Utilization + Conflict Detection   (3-col row)
 *   • System Notifications   (full-width row)
 */
export default function AuditAndConfigPanel() {
  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Audit Trail & Role Management ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Audit Trail</h3>
            <p className="card-description">Critical system actions</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Timetable Approved', user: 'priya.patel@cadence.edu', time: '2 min ago' },
              { label: 'User Role Changed', user: 'harsh.sharma@cadence.edu', time: '15 min ago' },
              { label: 'Course Updated', user: 'rajesh.kumar@cadence.edu', time: '1h ago' },
              { label: 'Login Failed', user: 'unknown', time: '2h ago' },
            ].map((entry, i) => (
              <div key={i} className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{entry.label}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{entry.user}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{entry.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Role Management</h3>
            <p className="card-description">Permission control</p>
          </div>
          <div className="space-y-3">
            {[
              { role: 'Admin',   desc: 'All Access' },
              { role: 'Faculty', desc: 'Schedule View' },
              { role: 'HOD',     desc: 'Dept. Management' },
            ].map((r) => (
              <div key={r.role} className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.role}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.desc}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>-</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── System Config / Utilization / Conflict Detection ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Configuration</h3>
            <p className="card-description">Global settings</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Academic Year', value: '2024-25' },
              { label: 'Semester Dates', value: 'Jul 1 – Dec 15' },
              { label: 'Holiday List', value: '15 holidays configured' },
            ].map((item) => (
              <div key={item.label} className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.value}</p>
                </div>
                <button className="text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>Edit</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Utilization Reports</h3>
            <p className="card-description">Resource usage analytics</p>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Classroom Usage', pct: 87, colorVar: 'var(--color-success)', textVar: 'var(--color-success-text)' },
              { label: 'Faculty Load',    pct: 73, colorVar: 'var(--color-warning)', textVar: 'var(--color-warning-text)' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                  <span className="font-semibold" style={{ color: item.textVar }}>{item.pct}%</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'var(--color-bg-surface-3)' }}>
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, background: item.colorVar }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Conflict Detection</h3>
            <p className="card-description">AI-powered conflict analysis</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-danger-subtle)', borderColor: 'var(--color-danger)' }}>
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>3 Schedule conflicts</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-warning-subtle)', borderColor: 'var(--color-warning)' }}>
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>5 Room overlaps</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)' }}>
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>12 Resolved today</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── System Notifications ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Notifications</h3>
          <p className="card-description">Alerts and announcements</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border-l-4 rounded-lg" style={{ background: 'var(--color-warning-subtle)', borderLeftColor: 'var(--color-warning)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>AI Engine Update</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Optimization algorithm improved by 15%</p>
          </div>
          <div className="p-4 border-l-4 rounded-lg" style={{ background: 'var(--color-info-subtle)', borderLeftColor: 'var(--color-primary)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>New Faculty Added</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>3 new faculty members registered</p>
          </div>
          <div className="p-4 border-l-4 rounded-lg" style={{ background: 'var(--color-success-subtle)', borderLeftColor: 'var(--color-success)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Backup Complete</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Daily system backup successful</p>
          </div>
        </div>
      </div>

    </div>
  )
}
