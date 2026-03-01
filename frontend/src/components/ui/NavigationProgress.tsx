'use client'

/**
 * NavigationProgress — Pixel-perfect Google/YouTube-style top progress bar.
 *
 * Google's bar characteristics (reverse-engineered):
 *  - Color:     #1a73e8 (Google Blue) with red finish flash on YouTube
 *  - Height:    3px
 *  - Start:     Jumps to ~20% instantly, then crawls
 *  - Crawl:     Eases out exponentially — fast then slows near 90%
 *  - Finish:    Jumps to 100% with 200ms ease-out, then fades in 400ms
 *  - Glow:      Subtle blue box-shadow to match Google's shimmer
 *  - Tip:       Slightly brighter/rounded right edge (the "head")
 */

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useCallback } from 'react'

// ─── Configuration (tweak here to adjust feel) ───────────────────────────────
const CFG = {
  // How far bar crawls before stopping (Google stops ~85-90%)
  CRAWL_CAP:       90,
  // Initial jump width when navigation starts
  INITIAL_WIDTH:   20,
  // Interval between crawl ticks (ms)
  TICK_MS:         200,
  // ms to hold at 100% before fading
  FINISH_HOLD_MS:  180,
  // ms for fade-out transition
  FADE_MS:         400,
} as const

// ─── Crawl speed curve — mirrors Google's deceleration ───────────────────────
function crawlStep(currentWidth: number): number {
  if (currentWidth <  30) return 8   + Math.random() * 4   // very fast start
  if (currentWidth <  50) return 5   + Math.random() * 3
  if (currentWidth <  65) return 3   + Math.random() * 2
  if (currentWidth <  75) return 1.5 + Math.random() * 1.5
  if (currentWidth <  82) return 0.8 + Math.random() * 0.8
  if (currentWidth <  87) return 0.4 + Math.random() * 0.4
  return 0.15 + Math.random() * 0.15  // nearly stalled near cap
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NavigationProgress() {
  const pathname = usePathname()

  // DOM refs (manipulated directly — avoids React re-render overhead)
  const barRef  = useRef<HTMLDivElement>(null)

  // State refs (no re-renders needed)
  const prevPathRef = useRef(pathname)
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef   = useRef(false)
  const widthRef    = useRef(0)

  // ── Direct DOM manipulators (no setState, pure perf) ─────────────────────
  const applyWidth = useCallback((w: number) => {
    widthRef.current = w
    if (!barRef.current) return
    barRef.current.style.width   = `${w}%`
  }, [])

  const applyOpacity = useCallback((op: number, durationMs = 0) => {
    if (!barRef.current) return
    const wrap = barRef.current.parentElement
    if (!wrap) return
    wrap.style.transition = durationMs ? `opacity ${durationMs}ms ease` : 'none'
    wrap.style.opacity    = String(op)
  }, [])

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const stopHide = useCallback(() => {
    if (hideRef.current) {
      clearTimeout(hideRef.current)
      hideRef.current = null
    }
  }, [])

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    stopTick()
    stopHide()
    activeRef.current = true

    // Reset instantly (no transition) then show
    if (barRef.current) {
      barRef.current.style.transition = 'none'
    }
    applyOpacity(1)
    applyWidth(0)

    // One frame later: jump to initial width WITH transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!barRef.current) return
        barRef.current.style.transition = 'width 120ms ease-out'
        applyWidth(CFG.INITIAL_WIDTH)

        // Begin crawl after initial jump settles
        setTimeout(() => {
          if (!activeRef.current) return
          tickRef.current = setInterval(() => {
            const next = Math.min(
              widthRef.current + crawlStep(widthRef.current),
              CFG.CRAWL_CAP
            )
            if (barRef.current) {
              barRef.current.style.transition = `width ${CFG.TICK_MS * 0.9}ms ease-out`
            }
            applyWidth(next)
          }, CFG.TICK_MS)
        }, 140)
      })
    })
  }, [stopTick, stopHide, applyWidth, applyOpacity])

  // ── Finish ────────────────────────────────────────────────────────────────
  const finish = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    stopTick()

    // Snap to 100% with a fast ease-out (Google's "swoosh" feeling)
    if (barRef.current) {
      barRef.current.style.transition = 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
    applyWidth(100)
    // Hold briefly at full width, then fade out wrapper
    hideRef.current = setTimeout(() => {
      applyOpacity(0, CFG.FADE_MS)

      // After fade completes: reset width silently
      setTimeout(() => {
        if (barRef.current) {
          barRef.current.style.transition = 'none'
        }
        applyWidth(0)
      }, CFG.FADE_MS + 50)
    }, CFG.FINISH_HOLD_MS)
  }, [stopTick, applyWidth, applyOpacity])

  // ── Intercept link clicks (event delegation — no per-link handlers) ───────
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Walk up from click target to find nearest <a>
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return

      const href   = anchor.getAttribute('href') ?? ''
      const target = anchor.getAttribute('target') ?? ''

      // Skip: no href, hash-only, external URLs, new tabs
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        /^https?:\/\//.test(href) ||
        target === '_blank'
      ) return

      // Skip: same page (pathname unchanged after click)
      try {
        const dest = new URL(href, window.location.href)
        if (dest.pathname === window.location.pathname) return
      } catch {
        // relative URL — allow through
      }

      start()
    }

    // Use capture phase so we catch clicks before React's handlers
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [start])

  // ── Finish when Next.js renders the new page ──────────────────────────────
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname
      finish()
    }
  }, [pathname, finish])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTick()
      stopHide()
    }
  }, [stopTick, stopHide])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        Wrapper: always in DOM (avoids mount/unmount flash).
        Opacity controlled directly via DOM for performance.
      */}
      <div
        aria-hidden="true"
        style={{
          position:       'fixed',
          top:            0,
          left:           0,
          right:          0,
          height:         '4px',
          zIndex:         9999,
          opacity:        0,
          pointerEvents:  'none',
          // GPU layer hint — prevents layout thrashing
          willChange:     'opacity',
        }}
      >
        {/* ── Progress bar ── */}
        <div
          ref={barRef}
          style={{
            height:          '100%',
            width:           '0%',
            background:      '#4285f4',
            borderRadius:    '0 3px 3px 0',
            willChange:      'width',
            clipPath:        'inset(0 0 0 0 round 0 4px 4px 0)',
          }}
        />


      </div>
    </>
  )
}