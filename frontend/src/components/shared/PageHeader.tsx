interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, description, children, className = '' }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${className}`}
      style={{
        paddingBottom: '16px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="flex-1 min-w-0">
        <h1
          className="truncate"
          style={{
            fontSize: 'clamp(18px, 2vw, 22px)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
            fontFamily: "'Poppins', 'Inter', sans-serif",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              marginTop: '4px',
              marginBottom: 0,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex-shrink-0 w-full sm:w-auto">{children}</div>
      )}
    </div>
  )
}
