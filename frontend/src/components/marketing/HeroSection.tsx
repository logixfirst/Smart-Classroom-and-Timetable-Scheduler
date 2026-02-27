'use client'

import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { AnimatedTimetable } from './AnimatedTimetable'

export function HeroSection() {
  return (
    <section
      style={{
        background:  'var(--cadence-off-white)',
        minHeight:   'calc(100vh - 64px)',
        position:    'relative',
        overflow:    'hidden',
        display:     'flex',
        alignItems:  'center',
      }}
    >
      {/* Background grid pattern */}
      <div
        className="mk-bg-grid"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Teal glow behind right side */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 72% 50%, rgba(42,157,143,0.10) 0%, transparent 70%)',
        }}
      />

      <div
        className="max-w-[1200px] mx-auto px-6 w-full"
        style={{ paddingTop: '60px', paddingBottom: '60px' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left: text + CTAs ───────────────────────────── */}
          <div>
            {/* Eyebrow */}
            <span className="mk-eyebrow">AI-Powered Academic Scheduling</span>

            {/* H1 */}
            <h1 className="mk-h1" style={{ marginBottom: '20px' }}>
              Your timetable.{' '}
              <span className="mk-text-gradient">Optimized in minutes.</span>
            </h1>

            {/* Body */}
            <p
              className="mk-body"
              style={{ maxWidth: '480px', marginBottom: '36px' }}
            >
              Cadence uses constraint-solving AI and machine learning to generate
              conflict-free timetables for your entire institution — automatically.
              What used to take days now takes minutes.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/contact" className="mk-btn-primary" style={{ fontSize: '16px', padding: '14px 28px' }}>
                Request a Demo
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <button
                style={{
                  background:   'transparent',
                  border:       'none',
                  cursor:       'pointer',
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          '10px',
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '15px',
                  fontWeight:   500,
                  color:        'var(--cadence-navy)',
                  padding:      '12px 0',
                  transition:   'opacity 150ms',
                }}
                onClick={() => {}}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div
                  style={{
                    width:        '42px',
                    height:       '42px',
                    borderRadius: '50%',
                    background:   'white',
                    border:       '1.5px solid rgba(27,58,92,0.12)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    boxShadow:    '0 2px 8px rgba(27,58,92,0.10)',
                    flexShrink:   0,
                  }}
                >
                  <Play size={14} style={{ fill: 'var(--cadence-navy)', color: 'var(--cadence-navy)', marginLeft: '2px' }} />
                </div>
                Watch how it works
              </button>
            </div>

            {/* Social trust micro-line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
              {/* Stacked avatars */}
              <div style={{ display: 'flex' }}>
                {['#1B3A5C', '#2A9D8F', '#1E4D6B'].map((bg, i) => (
                  <div
                    key={i}
                    style={{
                      width:        '28px',
                      height:       '28px',
                      borderRadius: '50%',
                      background:   bg,
                      border:       '2px solid var(--cadence-off-white)',
                      marginLeft:   i > 0 ? '-8px' : 0,
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      fontFamily:   'Poppins, sans-serif',
                      fontSize:     '10px',
                      fontWeight:   600,
                      color:        'white',
                    }}
                  >
                    {['D', 'R', 'P'][i]}
                  </div>
                ))}
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--cadence-slate)' }}>
                Trusted by <strong style={{ color: 'var(--cadence-navy)' }}>50+ institutions</strong> across India
              </span>
            </div>
          </div>

          {/* ── Right: animated timetable ───────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AnimatedTimetable />
          </div>
        </div>
      </div>
    </section>
  )
}
