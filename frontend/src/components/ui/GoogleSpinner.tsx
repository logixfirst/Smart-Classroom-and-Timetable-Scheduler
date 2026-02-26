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
  // Match project accent. 'white' is used for spinners inside coloured buttons.
  const arcColor = color ?? singleColor ?? '#2196F3'

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
      style={{ flexShrink: 0, display: 'inline-block' }}
    >
      {/*
        Track ring — always visible on every background:
        • On white/light-gray: 12 % opacity blue tint = visible but not distracting
        • On dark surfaces (#121212 / #1E1E1E / #2A2A2A): same 12% sits lighter
          than the surface so it still reads as a circle
        • For white arcs on blue buttons: 30% white track so it shows on blue
      */}
      <circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke={arcColor}
        strokeWidth={strokeWidth}
        opacity={arcColor === 'white' || arcColor === '#FFFFFF' ? 0.3 : 0.15}
      />
      {/* Animated arc — gsp-dash keyframe in globals.css */}
      <circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke={arcColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="1, 200"
        strokeDashoffset="0"
        className="gsp-arc"
      />
    </svg>
  )
}


