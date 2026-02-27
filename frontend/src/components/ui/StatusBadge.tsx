import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

type StatusBadgeProps = {
  status: 'approved' | 'pending' | 'draft' | 'rejected' | 'running' | 'completed' | 'failed'
  size?: 'sm' | 'md'
}

function getVariant(status: StatusBadgeProps['status']): string {
  switch (status) {
    case 'approved':
    case 'completed':
      return 'badge-success'
    case 'pending':
    case 'running':
      return 'badge-warning'
    case 'rejected':
    case 'failed':
      return 'badge-danger'
    case 'draft':
      return 'badge-neutral'
    default:
      return 'badge-neutral'
  }
}

function getLabel(status: StatusBadgeProps['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const variant = getVariant(status)
  const isRunning = status === 'running'
  const sizeStyle = size === 'sm' ? { height: '18px', fontSize: '10px' } : {}

  return (
    <span className={`badge ${variant}`} style={sizeStyle}>
      {isRunning && (
        <span className="mr-1 flex items-center">
          <GoogleSpinner size={10} />
        </span>
      )}
      {getLabel(status)}
    </span>
  )
}
