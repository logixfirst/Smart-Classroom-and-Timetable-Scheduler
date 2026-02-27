'use client'

interface NavItem {
  id: string
  label: string
  count?: number
}

interface InContentNavProps {
  items: NavItem[]
  activeItem: string
  onItemClick: (itemId: string) => void
}

export default function InContentNav({ items, activeItem, onItemClick }: InContentNavProps) {
  return (
    <div
      className="mb-4 sm:mb-6 overflow-x-auto no-scrollbar"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <nav className="flex" style={{ gap: 0, padding: 0 }}>
        {items.map(item => {
          const isActive = activeItem === item.id
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: isActive
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                borderBottomWidth: '2px',
                borderBottomStyle: 'solid',
                borderBottomColor: isActive ? 'var(--color-primary)' : 'transparent',
                whiteSpace: 'nowrap',
                transition: 'color 100ms, border-color 100ms',
              }}
              className={!isActive ? 'hover:bg-[var(--color-bg-surface-2)] hover:text-[var(--color-text-primary)]' : ''}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  className="ml-2 px-1.5 py-0.5 text-[11px] rounded"
                  style={{
                    background: isActive ? 'var(--color-primary-subtle)' : 'var(--color-bg-surface-3)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
