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
  /**
   * Max velocity per frame (%/frame). Prevents large jumps (e.g. 15%→55%) from
   * zooming to the target in <300ms — which looks identical to an instant jump.
   * Default 0.4 ≈ 24%/sec at 60fps → a 40% gap takes ≥ 1.7 s to traverse.
   */
  maxVelocity: number
  /**
   * Frames of no-change before starting the fake-crawl animation.
   * 120 frames ≈ 2 s at 60fps.  Set 0 to disable.
   */
  staleFrames: number
  /**
   * Fake-crawl speed when the backend has been silent for staleFrames.
   * Unit: % per animation frame.  Default 0.004 ≈ 0.24%/s at 60fps.
   * This shows life instead of freezing during loading / clustering phases.
   */
  creepPerFrame: number
  /**
   * Maximum % the fake crawl can advance beyond actualProgress.
   * Default 4.0 — never claims >4% more progress than the backend confirmed.
   */
  maxCreepAhead: number
}

const DEFAULT_CONFIG: SmoothProgressConfig = {
  acceleration:      0.02,
  damping:           0.85,
  epsilon:           0.05,
  completionDuration: 600,
  maxVelocity:       0.4,
  staleFrames:       120,
  creepPerFrame:     0.004,
  maxCreepAhead:     4.0,
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
    // Counts frames since this effect instance started (i.e. since actualProgress
    // last changed).  Resets to 0 every time the backend emits a new value.
    let framesRunning = 0

    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp

      const _deltaTime = Math.min(timestamp - lastTimestamp, 100)
      lastTimestamp = timestamp
      framesRunning++

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

        // CASE 2: Stale fake-crawl — backend has been silent for staleFrames.
        // Slowly creep forward so the bar shows life instead of freezing solid
        // during long phases (30 s loading, 5-10 s clustering, etc.).
        // Cap: never advance more than maxCreepAhead % beyond the real target.
        let effectiveTarget = target
        if (cfg.staleFrames > 0 && framesRunning > cfg.staleFrames && target < 99) {
          const extraCreep = Math.min(
            (framesRunning - cfg.staleFrames) * cfg.creepPerFrame,
            cfg.maxCreepAhead,
          )
          effectiveTarget = Math.min(target + extraCreep, 99)
        }

        // CASE 3: Physics-based animation toward effectiveTarget
        const distance = effectiveTarget - current
        if (distance <= 0) { velocityRef.current = 0; return Math.min(current, effectiveTarget) }
        // Snap to real target only (not fake-crawl ceiling) to avoid micro-jitter
        if (Math.abs(distance) < cfg.epsilon && effectiveTarget === target) {
          velocityRef.current = 0
          return target
        }

        velocityRef.current += distance * cfg.acceleration
        velocityRef.current *= cfg.damping
        // Velocity cap: prevents large gaps (e.g. 15%→55%) from resolving in
        // <300ms — without this the bar zooms and looks identical to a jump.
        velocityRef.current = Math.min(velocityRef.current, cfg.maxVelocity)

        return Math.max(current, Math.min(current + velocityRef.current, effectiveTarget))
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [
    actualProgress,
    cfg.acceleration, cfg.damping, cfg.epsilon, cfg.completionDuration,
    cfg.maxVelocity, cfg.staleFrames, cfg.creepPerFrame, cfg.maxCreepAhead,
  ])

  return displayProgress
}
