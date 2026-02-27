'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, Zap } from 'lucide-react'

// ── Grid dimensions ─────────────────────────────────────────────────────────
const COLS   = 6   // Mon–Sat
const ROWS   = 7   // 8am–2pm

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TIMES  = ['8:00', '9:00', '10:00', '11:00', '12:00', '1:00', '2:00']

// Courses with their colors
const COURSES: { code: string; color: string; bg: string }[] = [
  { code: 'MATH',  color: '#1B3A5C', bg: 'rgba(27,58,92,0.10)' },
  { code: 'PHY',   color: '#1E4D6B', bg: 'rgba(30,77,107,0.10)' },
  { code: 'CS101', color: '#2A9D8F', bg: 'rgba(42,157,143,0.12)' },
  { code: 'ENG',   color: '#0369a1', bg: 'rgba(3,105,161,0.10)' },
  { code: 'LAB',   color: '#0f766e', bg: 'rgba(15,118,110,0.12)' },
  { code: 'CHEM',  color: '#6d28d9', bg: 'rgba(109,40,217,0.10)' },
  { code: 'STA',   color: '#b45309', bg: 'rgba(180,83,9,0.10)' },
  { code: '—',     color: '#94a3b8', bg: 'rgba(148,163,184,0.06)' },
]

// Pre-built static layout (deterministic — no Math.random in render)
const STATIC_GRID: number[][] = [
  [0, 2, 5, 1, 3, 7],
  [2, 7, 0, 3, 7, 4],
  [5, 1, 3, 7, 0, 2],
  [1, 4, 7, 0, 5, 3],
  [3, 7, 2, 4, 1, 7],
  [4, 0, 1, 2, 7, 5],
  [7, 3, 4, 5, 2, 0],
]

// Conflict cell (row=1, col=2)
const CONFLICT_ROW = 1
const CONFLICT_COL = 2

// Total number of cells
const TOTAL_CELLS = COLS * ROWS

type Phase =
  | 'idle'
  | 'filling'
  | 'conflict'
  | 'resolving'
  | 'counter'
  | 'banner'
  | 'pause'
  | 'fading'

interface CellState {
  visible: boolean
  conflict: boolean
  resolved: boolean
  delay: number
}

// Pre-computed stagger delays (deterministic)
const STAGGER_DELAYS: number[][] = STATIC_GRID.map((row, r) =>
  row.map((_, c) => (r * COLS + c) * 55 + (((r * COLS + c) * 37) % 40)),
)

export function AnimatedTimetable() {
  const [phase,      setPhase]      = useState<Phase>('idle')
  const [cells,      setCells]      = useState<CellState[][]>(
    Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({
        visible:  false,
        conflict: false,
        resolved: false,
        delay:    STAGGER_DELAYS[r][c],
      })),
    ),
  )
  const [score,      setScore]      = useState(0)
  const [scoreVisible, setScoreVisible] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [gridVisible, setGridVisible]  = useState(false)
  const [gridFading,  setGridFading]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timerRef.current.forEach(clearTimeout)
    timerRef.current = []
  }
  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms)
    timerRef.current.push(id)
  }, [])

  const resetCells = useCallback(() =>
    Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({
        visible:  false,
        conflict: false,
        resolved: false,
        delay:    STAGGER_DELAYS[r][c],
      })),
    ),
  [])

  const runSequence = useCallback(() => {
    clearTimers()
    setScore(0)
    setScoreVisible(false)
    setBannerVisible(false)
    setGridFading(false)

    // Phase 1 — grid fades in
    setGridVisible(true)
    setCells(resetCells())
    setPhase('filling')
    after(100, () => {
      setCells(prev =>
        prev.map(row => row.map(c => ({ ...c, visible: true }))),
      )
    })

    // Phase 2 — conflict flash after all cells loaded (~2.5s stagger)
    const conflictStart = STAGGER_DELAYS[CONFLICT_ROW][CONFLICT_COL] + 400 + 600
    after(conflictStart, () => {
      setPhase('conflict')
      setCells(prev =>
        prev.map((row, r) =>
          row.map((c, col) =>
            r === CONFLICT_ROW && col === CONFLICT_COL
              ? { ...c, conflict: true }
              : c,
          ),
        ),
      )
    })

    // Phase 3 — resolve conflict
    after(conflictStart + 800, () => {
      setPhase('resolving')
      setCells(prev =>
        prev.map((row, r) =>
          row.map((c, col) =>
            r === CONFLICT_ROW && col === CONFLICT_COL
              ? { ...c, conflict: false, resolved: true }
              : c,
          ),
        ),
      )
    })

    // Phase 4 — score counter
    after(conflictStart + 1400, () => {
      setPhase('counter')
      setScoreVisible(true)
      // count up 0 → 94.2 in 800ms
      let frame = 0
      const frames = 40
      const tick = () => {
        frame++
        const progress = 1 - Math.pow(1 - frame / frames, 3)
        setScore(Math.round(progress * 942) / 10)
        if (frame < frames) {
          const id = setTimeout(tick, 20)
          timerRef.current.push(id)
        }
      }
      tick()
    })

    // Phase 5 — banner
    after(conflictStart + 2400, () => {
      setPhase('banner')
      setBannerVisible(true)
    })

    // Phase 6 — pause then fade out
    after(conflictStart + 3800, () => {
      setPhase('fading')
      setGridFading(true)
      setBannerVisible(false)
    })

    // Phase 7 — restart
    after(conflictStart + 4600, () => {
      setGridVisible(false)
      runSequence()
    })
  }, [after, resetCells])

  useEffect(() => {
    // Slight startup delay so it doesn't fire on SSR hydration
    const id = setTimeout(runSequence, 400)
    return () => {
      clearTimeout(id)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="relative select-none"
      style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}
      aria-hidden="true"
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 55% 50%, rgba(42,157,143,0.14) 0%, transparent 70%)',
          borderRadius: '24px',
        }}
      />

      {/* Card */}
      <div
        style={{
          background:  'white',
          borderRadius: '20px',
          border:       '1px solid rgba(27,58,92,0.10)',
          boxShadow:
            '0 4px 6px rgba(27,58,92,0.04), 0 16px 48px rgba(27,58,92,0.10)',
          overflow:  'hidden',
          opacity:   gridVisible ? (gridFading ? 0 : 1) : 0,
          transition: 'opacity 600ms ease-out',
        }}
      >
        {/* Card header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1B3A5C 0%, #2A9D8F 100%)',
            padding:    '14px 20px',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} color="rgba(255,255,255,0.8)" />
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 600, color: 'white' }}>
              Cadence AI — Generating
            </span>
          </div>
          {/* Generation complete banner */}
          <div
            style={{
              opacity:   bannerVisible ? 1 : 0,
              transform: bannerVisible ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'opacity 400ms, transform 400ms',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '6px',
              padding:   '3px 10px',
              fontSize:  '11px',
              fontWeight: 600,
              color:     'white',
              fontFamily: 'Inter, sans-serif',
              display:   'flex',
              alignItems: 'center',
              gap:       '5px',
            }}
          >
            <CheckCircle2 size={11} />
            Complete
          </div>
        </div>

        {/* Grid area */}
        <div style={{ padding: '12px 16px 16px' }}>
          {/* Day headers */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: `40px repeat(${COLS}, 1fr)`,
              gap:                 '2px',
              marginBottom:        '2px',
            }}
          >
            <div />
            {DAYS.map(d => (
              <div
                key={d}
                style={{
                  height:     '22px',
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                  fontSize:   '10px',
                  fontWeight: 600,
                  color:      'var(--cadence-slate)',
                  letterSpacing: '0.04em',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Rows */}
          {STATIC_GRID.map((row, rIdx) => (
            <div
              key={rIdx}
              style={{
                display:             'grid',
                gridTemplateColumns: `40px repeat(${COLS}, 1fr)`,
                gap:                 '2px',
                marginBottom:        '2px',
              }}
            >
              {/* Time label */}
              <div
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize:   '9px',
                  color:      'rgba(100,116,139,0.7)',
                }}
              >
                {TIMES[rIdx]}
              </div>

              {/* Cells */}
              {row.map((courseIdx, cIdx) => {
                const cell   = cells[rIdx]?.[cIdx]
                const course = COURSES[courseIdx]
                const isEmpty = courseIdx === 7
                
                let bg     = cell?.visible ? (isEmpty ? 'rgba(148,163,184,0.06)' : course.bg)   : 'rgba(241,245,249,0.6)'
                let border = '1px solid rgba(27,58,92,0.06)'
                let textC  = cell?.visible ? (isEmpty ? '#94a3b8' : course.color) : 'transparent'

                if (cell?.conflict) {
                  bg     = 'rgba(239,68,68,0.12)'
                  border = '1px solid rgba(239,68,68,0.5)'
                }
                if (cell?.resolved) {
                  bg     = 'rgba(42,157,143,0.12)'
                  border = '1px solid rgba(42,157,143,0.45)'
                  textC  = course.color
                }

                return (
                  <div
                    key={cIdx}
                    style={{
                      height:      '38px',
                      borderRadius: '5px',
                      background:  bg,
                      border,
                      display:    'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 400ms, border 300ms',
                      opacity:   cell?.visible ? 1 : 0,
                      transform: cell?.visible ? 'scale(1)' : 'scale(0.75)',
                      // staggered CSS transition
                      transitionDelay: cell?.visible ? `${cell.delay}ms` : '0ms',
                      transitionProperty: 'opacity, transform, background, border',
                      transitionDuration: '280ms, 280ms, 400ms, 300ms',
                      transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
                      position: 'relative',
                    }}
                  >
                    {/* Conflict icon */}
                    {cell?.conflict && (
                      <AlertTriangle size={12} color="#ef4444" style={{ position: 'absolute', top: '3px', right: '3px' }} />
                    )}
                    {/* Resolved checkmark */}
                    {cell?.resolved && (
                      <CheckCircle2 size={10} color="#2A9D8F" style={{ position: 'absolute', top: '3px', right: '3px' }} />
                    )}
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize:  '9px',
                        fontWeight: 600,
                        color:     textC,
                        letterSpacing: '0.03em',
                        transition: 'color 300ms',
                      }}
                    >
                      {isEmpty ? '' : course.code}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div
          style={{
            borderTop:   '1px solid rgba(27,58,92,0.07)',
            padding:     '10px 16px',
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'space-between',
            background:  'rgba(244,246,248,0.6)',
          }}
        >
          <div className="flex items-center gap-4">
            <div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--cadence-slate)' }}>
                Departments
              </span>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 600, color: 'var(--cadence-navy)' }}>
                6 / 6
              </div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(27,58,92,0.10)' }} />
            <div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--cadence-slate)' }}>
                Conflicts
              </span>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 600, color: phase === 'conflict' ? '#ef4444' : '#2A9D8F' }}>
                {phase === 'conflict' ? '1' : '0'}
              </div>
            </div>
          </div>

          {/* Score counter */}
          <div
            style={{
              opacity:   scoreVisible ? 1 : 0,
              transform: scoreVisible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 400ms, transform 400ms',
              background: 'linear-gradient(135deg, #1B3A5C, #2A9D8F)',
              borderRadius: '8px',
              padding:   '4px 10px',
              display:   'flex',
              alignItems: 'center',
              gap:       '5px',
            }}
          >
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.75)' }}>
              Score
            </span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 700, color: 'white' }}>
              {score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Floating "AI thinking" badge */}
      {(phase === 'filling' || phase === 'conflict') && (
        <div
          style={{
            position:   'absolute',
            top:        '-12px',
            right:      '12px',
            background: 'white',
            border:     '1px solid rgba(42,157,143,0.3)',
            borderRadius: '9999px',
            padding:    '5px 12px',
            display:    'flex',
            alignItems: 'center',
            gap:        '6px',
            boxShadow:  '0 4px 12px rgba(42,157,143,0.15)',
            animation:  'mk-counter-slide 300ms ease-out forwards',
          }}
        >
          <span
            style={{
              width:      '6px',
              height:     '6px',
              borderRadius: '50%',
              background: '#2A9D8F',
              display:    'inline-block',
              animation:  'progress-fill-breathe 1.2s ease-in-out infinite',
            }}
          />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#2A9D8F' }}>
            Optimizing schedule…
          </span>
        </div>
      )}
    </div>
  )
}
