'use client'

/**
 * Material Design indeterminate circular progress indicator.
 *
 * Matches the exact behaviour seen in Google Play Store, Google Files, and
 * every modern Google app:
 *   • The arc continuously GROWS then SHRINKS (expand → contract) while
 *     the whole ring rotates at a constant speed.
 *   • Single blue colour — project accent #2563EB (or override via `color`).
 *   • No colour cycling / no rainbow transitions.
 *
 * Two CSS animations drive the effect (defined in globals.css):
 *   gsp-rotate  — spins the <svg> one full turn per 1.4 s (linear)
 *   gsp-arc     — oscillates stroke-dashoffset to grow/shrink the arc (ease-in-out)
 * Running them at the same period causes the arc's tail to appear to "chase"
 * its own head — the iconic Play Store / Google Files look.
 *
 * Usage:
 *   <GoogleSpinner />                          // 24 px, blue accent
 *   <GoogleSpinner size={48} className="mx-auto mb-4" />
 *   <GoogleSpinner size={16} color="white" /> // inside a coloured button
 */
export function GoogleSpinner({
  size = 24,
  className = '',
  color,
  /** @deprecated use `color` instead */
  singleColor,
}: {
  /** Diameter in pixels. Default 24. */
  size?: number
  /** Extra Tailwind / CSS classes (e.g. mx-auto, mb-4, mr-2). */
  className?: string
  /**
   * Arc colour. Defaults to project blue accent #2563EB.
   * Pass "white" for spinners inside coloured buttons.
   */
  color?: string
  /** @deprecated alias kept for backward-compatibility — use `color`. */
  singleColor?: string
}) {
  // resolve colour: explicit prop > legacy singleColor > project blue accent
  const arcColor = color ?? singleColor ?? '#2563EB'

  // Fixed viewBox geometry — actual display size is controlled by width/height.
  //   r = 20  →  circumference ≈ 125.66
  //   gsp-arc keyframe animates dashoffset: 113 (short tail) ↔ 12 (near-full arc)
  const VB   = 44
  const R    = 20
  const SW   = 3.6
  const CIRC = 2 * Math.PI * R   // 125.66…

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      fill="none"
      role="status"
      aria-label="Loading"
      className={`gsp-rotate${className ? ` ${className}` : ''}`}
      style={{ flexShrink: 0, display: 'inline-block' }}
    >
      {/* Faint track ring for depth */}
      <circle
        cx={VB / 2}
        cy={VB / 2}
        r={R}
        stroke={arcColor}
        strokeWidth={SW}
        opacity={0.15}
      />
      {/* Animated arc — grows and shrinks via gsp-arc keyframe */}
      <circle
        cx={VB / 2}
        cy={VB / 2}
        r={R}
        stroke={arcColor}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        className="gsp-arc"
      />
    </svg>
  )
}

