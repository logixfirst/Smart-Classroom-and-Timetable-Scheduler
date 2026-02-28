'use client'

/**
 * ScoreBar — compact horizontal progress bar with label + value.
 *
 * Used inside VariantCard for each quality dimension.
 * Purely presentational; zero side-effects.
 */

interface ScoreBarProps {
  label: string
  /** Score value 0-100. Pass -1 to show "N/A". */
  value: number
  /** Override fill colour; defaults to CSS primary. */
  color?: string
  /** If true, render a 2-line label+bar without a right-side number. */
  compact?: boolean
}

/** Map score to a traffic-light tint so low is red, high is green. */
function scoreColor(value: number, override?: string): string {
  if (override) return override
  if (value >= 80) return 'var(--color-success, #34a853)'
  if (value >= 55) return 'var(--color-warning, #fbbc04)'
  return 'var(--color-danger, #ea4335)'
}

export function ScoreBar({ label, value, color, compact = false }: ScoreBarProps) {
  const isNA = value < 0
  const displayValue = isNA ? 'N/A' : `${Math.round(value)}%`
  const fillColor = isNA ? 'var(--color-bg-surface-3)' : scoreColor(value, color)
  const fillWidth = isNA ? 0 : Math.min(100, Math.max(0, value))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* label row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {label}
        </span>
        {!compact && (
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: isNA ? 'var(--color-text-muted)' : fillColor,
          }}>
            {displayValue}
          </span>
        )}
      </div>

      {/* track */}
      <div style={{
        height: 5,
        borderRadius: 999,
        background: 'var(--color-bg-surface-3, #f1f3f4)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${fillWidth}%`,
            borderRadius: 999,
            background: fillColor,
            transition: 'width 500ms cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
    </div>
  )
}
