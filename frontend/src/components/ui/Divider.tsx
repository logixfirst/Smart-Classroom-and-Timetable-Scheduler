interface DividerProps {
  className?: string
  spacing?: 'sm' | 'md' | 'lg'
}

const spacingMap = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
}

export function Divider({ className = '', spacing = 'md' }: DividerProps) {
  return (
    <hr
      className={`${spacingMap[spacing]} ${className}`}
      style={{ border: 'none', borderTop: '1px solid var(--color-border)' }}
    />
  )
}
