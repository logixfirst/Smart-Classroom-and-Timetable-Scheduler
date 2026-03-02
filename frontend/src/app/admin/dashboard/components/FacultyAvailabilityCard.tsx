interface FacultyMember {
  id: string
  name: string
  department: string | null
  isAvailable: boolean
}

interface FacultyAvailabilityCardProps {
  faculty: FacultyMember[]
  loading: boolean
}

export default function FacultyAvailabilityCard({ faculty, loading }: FacultyAvailabilityCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Faculty Availability - Today</h3>
        <p className="card-description">
          Mark faculty as available/unavailable for quick substitutions
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
            Loading faculty...
          </div>
        ) : faculty.length === 0 ? (
          <div className="col-span-full text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
            No faculty data available
          </div>
        ) : (
          faculty.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border"
              style={{ background: 'var(--color-bg-surface-2)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {member.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {member.department || 'N/A'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked={member.isAvailable}
                  onChange={(e) => {
                    console.log(`Faculty ${member.id} availability:`, e.target.checked)
                  }}
                />
                <div className="w-9 h-5 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" style={{ background: 'var(--color-bg-surface-3)' }} />
                <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {member.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
