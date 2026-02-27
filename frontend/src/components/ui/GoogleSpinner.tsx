'use client'

/**
 * Material Design indeterminate circular progress indicator.
 * Matches Google Play Store, Google Files, Chrome exactly.
 *
 * WHY THE TRACK RING EXISTS:
 *   On white (#FFFFFF), light-gray (#F5F5F5), or dark (#121212/#1E1E1E/#2A2A2A)
 *   surfaces the track gives the spinner a visual anchor — without it the arc
 *   looks like it is floating on nothing. Google's own spinner always shows the
 *   faint blue-tinted track ring.
 *
 * DEFAULT COLOR: #2196F3 — matches the project's btn-primary accent exactly.
 *
 * Usage:
 *   <GoogleSpinner />                          // 48 px, project blue + track
 *   <GoogleSpinner size={24} className="mr-2" />
 *   <GoogleSpinner size={16} color="white" />  // buttons on coloured bg
 */
export function GoogleSpinner({
  size = 48,
  className = '',
  color,
  /** @deprecated use `color` */
  singleColor,
}: {
  size?: number
  className?: string
  color?: string
  /** @deprecated */
  singleColor?: string
}) {
  // When an explicit color is passed (e.g. color="white" on a coloured button),
  // apply it via the SVG's `color` CSS property so `currentColor` picks it up.
  // When nothing is passed, CSS vars --spinner-color / --spinner-track handle
  // both light (#1A73E8 / #E8F0FE) and dark (#8AB4F8 / #3C4043) automatically.
  const explicitColor = color ?? singleColor
  const isWhite = explicitColor === 'white' || explicitColor === '#FFFFFF'

  // strokeWidth scales with size so thin spinners look thin, large ones look bold.
  // Clamped between 2.5 (min readability) and 4 (max Material weight).
  const strokeWidth = Math.min(4, Math.max(2.5, size * 0.083)).toFixed(1)

  return (
    <svg
      width={size}
      height={size}
      viewBox="25 25 50 50"
      fill="none"
      role="status"
      aria-label="Loading"
      className={`gsp-rotate${className ? ` ${className}` : ''}`}
      style={{
        flexShrink: 0,
        display: 'inline-block',
        // Inject explicit color into the SVG's color cascade so currentColor works.
        // When no color prop given, CSS vars on :root / .dark handle theming.
        ...(explicitColor ? { color: explicitColor } : {}),
      }}
    >
      {/* Track ring — uses --spinner-track var (or explicit color at low opacity) */}
      <circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke={explicitColor ? explicitColor : 'var(--spinner-track)'}
        strokeWidth={strokeWidth}
        opacity={explicitColor ? (isWhite ? 0.3 : 0.18) : 1}
      />
      {/* Animated arc — gsp-dash keyframe in globals.css */}
      <circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke={explicitColor ? explicitColor : 'var(--spinner-color)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="1, 200"
        strokeDashoffset="0"
        className="gsp-arc"
      />
    </svg>
  )
}


