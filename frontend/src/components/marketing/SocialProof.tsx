'use client'

import { useRef, useEffect } from 'react'
import { useScrollReveal, useCountUp } from '@/hooks/useScrollReveal'

const STATS = [
  { value: 50,   suffix: '+',  label: 'Institutions'           },
  { value: 2,    suffix: 'M+', label: 'Schedules Generated'    },
  { value: 94,   suffix: '%',  label: 'Conflict-free rate'     },
  { value: 5,    suffix: ' min', label: 'Avg. generation time' },
]

const INSTITUTIONS = [
  'IIT Bangalore',
  'BITS Pilani',
  'VIT University',
  'Manipal Institute',
  'SRM University',
  'Amity University',
  'JNTU Hyderabad',
  'Jadavpur University',
]

function StatItem({ value, suffix, label, trigger }: {
  value: number; suffix: string; label: string; trigger: boolean
}) {
  const count = useCountUp(value, 1200, trigger)
  return (
    <div className="flex flex-col items-center text-center px-8">
      <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: 'var(--cadence-navy)' }}>
        {count}{suffix}
      </span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)', marginTop: '4px' }}>
        {label}
      </span>
    </div>
  )
}

export function SocialProof() {
  const { ref: statsRef, visible } = useScrollReveal(0.3)

  // Duplicate institutions for seamless marquee
  const marqueeItems = [...INSTITUTIONS, ...INSTITUTIONS]

  return (
    <section style={{ background: 'white', borderTop: '1px solid rgba(27,58,92,0.08)', borderBottom: '1px solid rgba(27,58,92,0.08)' }}>
      {/* Trusted by header */}
      <div style={{ textAlign: 'center', padding: '28px 24px 16px' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(100,116,139,0.6)', textTransform: 'uppercase' }}>
          Trusted by institutions across India
        </p>
      </div>

      {/* Marquee */}
      <div style={{ overflow: 'hidden', padding: '0 0 24px' }}>
        <div className="mk-marquee-track">
          {marqueeItems.map((name, i) => (
            <div
              key={i}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '8px',
                padding:    '0 40px',
                whiteSpace: 'nowrap',
                fontFamily: 'Inter, sans-serif',
                fontSize:   '15px',
                fontWeight: 600,
                color:      'rgba(15,28,46,0.35)',
                letterSpacing: '0.02em',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(42,157,143,0.3)' }} />
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div
        ref={statsRef as React.RefObject<HTMLDivElement>}
        style={{ borderTop: '1px solid rgba(27,58,92,0.06)', padding: '28px 24px' }}
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Mobile: 2×2 grid */}
          <div className="grid grid-cols-2 lg:hidden gap-6">
            {STATS.map(s => (
              <StatItem key={s.label} {...s} trigger={visible} />
            ))}
          </div>
          {/* Desktop: horizontal strip with dividers */}
          <div className="hidden lg:flex items-center justify-center">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && (
                  <div style={{ width: '1px', height: '48px', background: 'rgba(27,58,92,0.12)', margin: '0 4px' }} />
                )}
                <StatItem {...s} trigger={visible} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
