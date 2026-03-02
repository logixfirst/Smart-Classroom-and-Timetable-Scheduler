import { useRef, useCallback } from 'react'
import React from 'react'
import { crawlStep } from '@/lib/progressUtils'

/**
 * Imperative in-card progress bar hook (Google-style card progress indicator).
 *
 * Returns { start, finish, reset, BarElement }.
 * Place BarElement at the top of a `position:relative; overflow:hidden` card.
 *
 * The crawlStep deceleration logic mirrors NavigationProgress:
 * - Fast at start (0–30%)
 * - Gradually slows, stalls near 90%
 * - `finish()` snaps to 100% then fades out
 */
export function useCardProgress(): {
  start:      () => void
  finish:     () => void
  reset:      () => void
  BarElement: React.JSX.Element
} {
  const barRef    = useRef<HTMLDivElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef   = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const widthRef  = useRef(0)
  const activeRef = useRef(false)

  const setW = useCallback((w: number) => {
    widthRef.current = w
    if (barRef.current) barRef.current.style.width = `${w}%`
  }, [])

  const setOp = useCallback((op: number, ms = 0) => {
    const el = wrapRef.current
    if (!el) return
    el.style.transition = ms ? `opacity ${ms}ms ease` : 'none'
    el.style.opacity    = String(op)
  }, [])

  const stop = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current);  tickRef.current = null }
    if (hideRef.current) { clearTimeout(hideRef.current);   hideRef.current = null }
  }, [])

  const start = useCallback(() => {
    stop()
    activeRef.current = true
    if (barRef.current) barRef.current.style.transition = 'none'
    setOp(1)
    setW(0)

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!barRef.current) return
      barRef.current.style.transition = 'width 120ms ease-out'
      setW(20)
      setTimeout(() => {
        if (!activeRef.current) return
        tickRef.current = setInterval(() => {
          const next = Math.min(widthRef.current + crawlStep(widthRef.current), 90)
          if (barRef.current) barRef.current.style.transition = 'width 180ms ease-out'
          setW(next)
        }, 200)
      }, 140)
    }))
  }, [stop, setOp, setW])

  const finish = useCallback(() => {
    stop()
    activeRef.current = false
    if (barRef.current) barRef.current.style.transition = 'width 200ms cubic-bezier(0.4,0,0.2,1)'
    setW(100)
    hideRef.current = setTimeout(() => {
      setOp(0, 400)
      setTimeout(() => {
        if (barRef.current) barRef.current.style.transition = 'none'
        setW(0)
      }, 450)
    }, 180)
  }, [stop, setOp, setW])

  const reset = useCallback(() => {
    stop()
    activeRef.current = false
    if (barRef.current) barRef.current.style.transition = 'none'
    setOp(0, 300)
    setTimeout(() => setW(0), 350)
  }, [stop, setOp, setW])

  const BarElement = (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        right:         0,
        height:        '4px',
        opacity:       0,
        pointerEvents: 'none',
        willChange:    'opacity',
        borderRadius:  '28px 28px 0 0',
        overflow:      'hidden',
      }}
    >
      <div
        ref={barRef}
        style={{
          height:     '100%',
          width:      '0%',
          background: '#4285f4',
          willChange: 'width',
        }}
      />
    </div>
  )

  return { start, finish, reset, BarElement }
}
