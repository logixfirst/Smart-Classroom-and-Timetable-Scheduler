'use client'

/**
 * Exact Material Design indeterminate circular progress indicator.
 *
 * Matches Google Play Store, Google Files, Chrome — precisely:
 *   • stroke-dasharray  1,200 → 100,200  controls arc LENGTH (grow/shrink)
 *   • stroke-dashoffset 0 → -15 → -125   moves the arc START forward (sweep)
 *   • Outer SVG rotates at 2 s linear — separate from the arc timing
 *   • cubic-bezier(0.4, 0.0, 0.2, 1) — Material Design standard easing
 *
 * All geometry is fixed in viewBox="25 25 50 50" (cx=50 cy=50 r=20) so
 * the math matches the keyframe values exactly at every rendered size.
 *
 * Usage:
 *   <GoogleSpinner />                          // 48 px, project blue
 *   <GoogleSpinner size={24} className="mr-2" />
 *   <GoogleSpinner size={16} color="white" />  // inside a coloured button
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
  const arcColor = color ?? singleColor ?? '#2563EB'

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
      <circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke={arcColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="1, 200"
        strokeDashoffset="0"
        className="gsp-arc"
      />
    </svg>
  )
}


