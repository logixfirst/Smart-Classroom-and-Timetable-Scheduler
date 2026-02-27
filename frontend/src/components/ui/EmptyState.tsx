interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

function EmptyIllustration() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="3"
        stroke="var(--color-text-muted)"
        strokeWidth="2"
        strokeDasharray="4 3"
        fill="none"
      />
      <line
        x1="6"
        y1="18"
        x2="42"
        y2="18"
        stroke="var(--color-text-muted)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <circle cx="12" cy="14" r="2" fill="var(--color-text-muted)" opacity="0.5" />
      <circle cx="18" cy="14" r="2" fill="var(--color-text-muted)" opacity="0.5" />
    </svg>
  )
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <EmptyIllustration />
      <p
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-center"
          style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            maxWidth: '300px',
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
