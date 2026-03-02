import { useState, useEffect, useRef } from 'react'

export interface SmoothProgressConfig {
  /** Base acceleration factor (0.01–0.05). Higher = faster acceleration. */
  acceleration: number
  /** Velocity damping factor (0.7–0.95). Higher = less damping, more momentum. */
  damping: number
  /** Minimum velocity threshold. Below this, snap to target. */
  epsilon: number
  /** Completion animation duration in ms. */
  completionDuration: number
}

const DEFAULT_CONFIG: SmoothProgressConfig = {
  acceleration:      0.02,
  damping:           0.85,
  epsilon:           0.05,
  completionDuration: 600,
}

/**
 * Enterprise-grade smooth progress hook with velocity-based physics.
 *
 * CRITICAL CONSTRAINTS:
 * 1. displayProgress ≤ actualProgress (never exceed backend)
 * 2. displayProgress is monotonic (never decreases)
 * 3. Uses requestAnimationFrame (60 FPS)
 * 4. Velocity model: velocity += (target − current) × acceleration
 * 5. Damping: velocity *= damping
 *
 * @param actualProgress - Authoritative backend progress (0–100)
 * @param config         - Optional physics tuning parameters
 * @returns Smoothly animated display progress (0–100)
 */
export function useSmoothProgress(
  actualProgress: number,
  config: Partial<SmoothProgressConfig> = {},
): number {
  const [displayProgress, setDisplayProgress] = useState(0)
  const velocityRef          = useRef(0)
  const lastTargetRef        = useRef(0)
  const completionStartRef   = useRef<number | null>(null)

  const cfg = { ...DEFAULT_CONFIG, ...config }

  useEffect(() => {
    const target = Math.max(0, Math.min(100, actualProgress))

    // CRITICAL: monotonic — ignore backward movement unless it's a completion reset
    if (target < lastTargetRef.current && target < 100) return
    lastTargetRef.current = target

    let animationFrame: number
    let lastTimestamp: number | null = null

    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp

      const _deltaTime = Math.min(timestamp - lastTimestamp, 100)
      lastTimestamp = timestamp

      setDisplayProgress(current => {
        // CASE 1: Completion animation (backend reached 100%)
        if (target >= 100) {
          if (completionStartRef.current === null) completionStartRef.current = timestamp
          const elapsed  = timestamp - completionStartRef.current
          const progress = Math.min(elapsed / cfg.completionDuration, 1)
          const eased    = 1 - Math.pow(1 - progress, 3)
          return Math.min(100, current + (100 - current) * eased)
        }
        completionStartRef.current = null

        // CASE 2: Physics-based animation
        const distance = target - current
        if (distance <= 0) { velocityRef.current = 0; return Math.min(current, target) }
        if (Math.abs(distance) < cfg.epsilon) { velocityRef.current = 0; return target }

        velocityRef.current += distance * cfg.acceleration
        velocityRef.current *= cfg.damping

        return Math.max(current, Math.min(current + velocityRef.current, target))
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [actualProgress, cfg.acceleration, cfg.damping, cfg.epsilon, cfg.completionDuration])

  return displayProgress
}
