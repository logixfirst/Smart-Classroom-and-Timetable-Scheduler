'use client'

import { useRef, useState, useEffect } from 'react'

/**
 * useScrollReveal — reveals an element when it enters the viewport.
 * Returns a ref to attach to the target element and a `visible` bool.
 *
 * @param threshold  - fraction of element that must be visible (0–1)
 * @param once       - once visible, stay visible (default: true)
 */
export function useScrollReveal(threshold = 0.15, once = true) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, once])

  return { ref, visible }
}

/**
 * useCountUp — animates a number from 0 to `target` over `duration` ms
 * when `trigger` becomes true.
 */
export function useCountUp(target: number, duration = 1200, trigger = false) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!trigger) return
    let start: number | null = null
    let raf: number

    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, trigger])

  return value
}
