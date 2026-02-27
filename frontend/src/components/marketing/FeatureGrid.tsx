'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'
import { CheckCircle2, X } from 'lucide-react'

interface FeatureRowProps {
  eyebrow:   string
  heading:   string
  body:      string
  bullets:   string[]
  imageAlt?: string
  imageSide: 'left' | 'right'
  imagePlaceholder: React.ReactNode
}

function FeatureRow({ eyebrow, heading, body, bullets, imageSide, imagePlaceholder }: FeatureRowProps) {
  const { ref, visible } = useScrollReveal(0.18)

  const textBlock = (
    <div className="flex flex-col justify-center">
      <span className="mk-eyebrow">{eyebrow}</span>
      <h3 className="mk-h3" style={{ marginBottom: '16px' }}>{heading}</h3>
      <p className="mk-body" style={{ marginBottom: '24px', fontSize: '16px' }}>{body}</p>
      <ul className="flex flex-col gap-3">
        {bullets.map(b => (
          <li key={b} className="flex items-start gap-3">
            <CheckCircle2 size={17} style={{ color: 'var(--cadence-teal)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--cadence-slate)' }}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  const imageBlock = (
    <div
      style={{
        background:   'linear-gradient(135deg, var(--cadence-off-white) 0%, rgba(42,157,143,0.06) 100%)',
        borderRadius: '20px',
        border:       '1px solid rgba(27,58,92,0.08)',
        minHeight:    '280px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        overflow:     'hidden',
      }}
    >
      {imagePlaceholder}
    </div>
  )

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`mk-reveal ${visible ? 'mk-reveal-visible' : 'mk-reveal-hidden'} grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center`}
      style={{ marginBottom: '80px' }}
    >
      {imageSide === 'right' ? (
        <>{textBlock}{imageBlock}</>
      ) : (
        <>{imageBlock}{textBlock}</>
      )}
    </div>
  )
}

// ── Decorative mocks ──────────────────────────────────────────────────────────
function ConflictMock() {
  const cells = [
    { label: 'MATH', ok: true  }, { label: 'PHY',  ok: true  }, { label: 'CS101', ok: true  },
    { label: 'ENG',  ok: true  }, { label: 'LAB',  ok: false }, { label: 'CHEM',  ok: true  },
    { label: 'STA',  ok: true  }, { label: 'PHY',  ok: true  }, { label: 'MATH',  ok: true  },
  ]
  return (
    <div style={{ padding: '32px', width: '100%' }}>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 600, color: 'var(--cadence-navy)', marginBottom: '16px', letterSpacing: '0.04em' }}>
        TIMETABLE — SEMESTER 1
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {cells.map((c, i) => (
          <div
            key={i}
            style={{
              borderRadius: '8px',
              padding:      '10px 8px',
              textAlign:    'center',
              background:   c.ok ? 'rgba(42,157,143,0.10)' : 'rgba(239,68,68,0.10)',
              border:       `1px solid ${c.ok ? 'rgba(42,157,143,0.3)' : 'rgba(239,68,68,0.4)'}`,
              fontFamily:   'Inter, sans-serif',
              fontSize:     '11px',
              fontWeight:   600,
              color:        c.ok ? 'var(--cadence-teal)' : '#dc2626',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          '4px',
            }}
          >
            {!c.ok && <X size={10} />}
            {c.ok && <CheckCircle2 size={10} />}
            {c.label}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px', background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.2)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle2 size={14} color="#2A9D8F" />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#2A9D8F', fontWeight: 600 }}>0 conflicts detected — guaranteed</span>
      </div>
    </div>
  )
}

function PreferencesMock() {
  const prefs = [
    { name: 'Dr. R. Sharma',   pref: 'Morning slots',    score: 95 },
    { name: 'Prof. K. Menon',  pref: 'No Friday PM',     score: 88 },
    { name: 'Dr. A. Singh',    pref: 'Lab in Block B',   score: 92 },
    { name: 'Prof. M. Nair',   pref: '≤ 4 hrs/day',      score: 97 },
  ]
  return (
    <div style={{ padding: '28px', width: '100%' }}>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 600, color: 'var(--cadence-navy)', marginBottom: '14px' }}>
        FACULTY PREFERENCES
      </div>
      {prefs.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(27,58,92,0.06)' }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--cadence-ink)' }}>{p.name}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--cadence-slate)' }}>{p.pref}</div>
          </div>
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, color: '#2A9D8F' }}>{p.score}%</div>
        </div>
      ))}
      <div style={{ marginTop: '12px', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--cadence-slate)' }}>
        Satisfaction score weighted across all preferences
      </div>
    </div>
  )
}

function SubstitutionMock() {
  return (
    <div style={{ padding: '28px', width: '100%' }}>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 600, color: 'var(--cadence-navy)', marginBottom: '14px' }}>
        SUBSTITUTION — Dr. SHARMA ABSENT
      </div>
      {[
        { name: 'Prof. K. Iyer',  match: 'Subject expert', conf: 'High',   color: '#16a34a' },
        { name: 'Dr. V. Rao',     match: 'Workload OK',     conf: 'Medium', color: '#ca8a04' },
      ].map(s => (
        <div key={s.name} style={{ background: 'white', border: '1px solid rgba(27,58,92,0.08)', borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--cadence-ink)' }}>{s.name}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--cadence-slate)' }}>{s.match}</div>
          </div>
          <div style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40`, borderRadius: '6px', padding: '3px 10px', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600 }}>
            {s.conf}
          </div>
        </div>
      ))}
      <button style={{ marginTop: '8px', width: '100%', padding: '10px', background: 'linear-gradient(135deg,#1B3A5C,#2A9D8F)', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
        Assign Prof. K. Iyer →
      </button>
    </div>
  )
}

export function FeatureGrid() {
  return (
    <section style={{ background: 'var(--cadence-off-white)', padding: '0' }}>
      <div className="mk-section">
        <FeatureRow
          eyebrow="Constraint Solving"
          heading="Mathematically guaranteed. No exceptions."
          body="Cadence uses Google OR-Tools CP-SAT solver — the same constraint satisfaction technology used in global logistics and operations research — to ensure no faculty teaches two classes simultaneously, no room is double-booked, and every student gets a coherent schedule."
          bullets={[
            'Faculty conflict detection',
            'Room capacity enforcement',
            'Student batch isolation',
            'Lab vs lecture room matching',
            'Cross-department scheduling',
          ]}
          imageSide="right"
          imagePlaceholder={<ConflictMock />}
        />
        <FeatureRow
          eyebrow="Preference Engine"
          heading="Scheduling that respects people."
          body="Faculty set their preferred time slots, break durations, and room types. Cadence weighs these preferences as soft constraints — maximizing satisfaction while maintaining schedule integrity. A happier faculty teaches better."
          bullets={[
            'Per-faculty time slot preferences',
            'Maximum daily teaching hours',
            'Preferred room and building',
            'Break duration constraints',
            'Satisfaction score transparency',
          ]}
          imageSide="left"
          imagePlaceholder={<PreferencesMock />}
        />
        <FeatureRow
          eyebrow="Real-time Substitution"
          heading="Absent today. Covered in seconds."
          body="When a faculty member is absent, Cadence instantly identifies the best available substitute — matching subject expertise, checking workload limits, and respecting existing schedules. No WhatsApp groups. No manual coordination."
          bullets={[
            'Expertise-matched suggestions',
            'Workload limit enforcement',
            'Confidence scoring (High / Medium / Low)',
            'One-click substitution assignment',
            'Full audit trail of all changes',
          ]}
          imageSide="right"
          imagePlaceholder={<SubstitutionMock />}
        />
      </div>
    </section>
  )
}
