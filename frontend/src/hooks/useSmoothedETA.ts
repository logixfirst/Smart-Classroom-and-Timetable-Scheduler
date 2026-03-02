import { useState, useEffect, useRef } from 'react'

/**
 * Smooth ETA using exponential smoothing.
 *
 * WHY SEPARATE FROM PROGRESS SMOOTHING:
 * - ETA can increase (due to cluster complexity)
 * - ETA has different smoothing characteristics
 * - Progress must be monotonic; ETA must not
 *
 * EXPONENTIAL SMOOTHING:
 *   smoothed += (actual − smoothed) × alpha
 *   - Alpha = 0.15 means 15% weight on the new value
 *   - Lower alpha = more smoothing (slower response)
 *   - Higher alpha = less smoothing (faster response)
 *
 * @param actualETA - Backend ETA in seconds (can increase or decrease)
 * @param alpha     - Smoothing factor (0–1). Default 0.15.
 * @returns Smoothed ETA in seconds
 */
export function useSmoothedETA(actualETA: number, alpha: number = 0.15): number {
  const [displayETA, setDisplayETA] = useState(actualETA)
  const alphaRef = useRef(alpha)
  alphaRef.current = alpha

  useEffect(() => {
    const clampedAlpha = Math.max(0, Math.min(1, alphaRef.current))
    let animationFrame: number

    const smooth = () => {
      setDisplayETA(current => {
        const diff   = actualETA - current
        const update = current + diff * clampedAlpha
        if (Math.abs(diff) < 0.1) return actualETA
        return update
      })
      animationFrame = requestAnimationFrame(smooth)
    }

    animationFrame = requestAnimationFrame(smooth)
    return () => cancelAnimationFrame(animationFrame)
  }, [actualETA])

  return displayETA
}
