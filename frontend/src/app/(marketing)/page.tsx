import type { Metadata } from 'next'
import Link  from 'next/link'
import { Settings2, Zap, CheckSquare, X, Check, ArrowRight, Quote } from 'lucide-react'
import { HeroSection }    from '@/components/marketing/HeroSection'
import { SocialProof }    from '@/components/marketing/SocialProof'
import { FeatureGrid }    from '@/components/marketing/FeatureGrid'
import { PricingTable }   from '@/components/marketing/PricingTable'

export const metadata: Metadata = {
  title:       'Cadence — AI-Powered Academic Timetable Scheduling',
  description: 'Generate conflict-free timetables for your institution in minutes. AI scheduling software for universities, colleges, and schools across India.',
  openGraph: {
    title:       'Cadence — Academic Scheduling, Reimagined',
    description: 'Generate conflict-free timetables for your institution in minutes.',
    images:      [{ url: '/og-image.png', width: 1200, height: 630 }],
    type:        'website',
  },
  twitter: { card: 'summary_large_image' },
}

// ── Problem/Solution section ─────────────────────────────────────────────────
const OLD_WAY = [
  'Manual Excel spreadsheets taking 3–5 days',
  'Conflicts discovered after distribution',
  'No faculty preference consideration',
  'Re-do from scratch every semester',
  'Zero visibility into room utilization',
  'Substitution handled through WhatsApp groups',
]

const CADENCE_WAY = [
  'AI generates a full timetable in under 5 minutes',
  'Zero conflicts — mathematically guaranteed',
  'Faculty preferences embedded into the algorithm',
  'Reuse constraints, regenerate in one click',
  'Real-time room utilization dashboard',
  'Instant substitution suggestions in seconds',
]

// ── How it works steps ───────────────────────────────────────────────────────
const STEPS = [
  {
    icon:  <Settings2 size={28} color="var(--cadence-teal)" />,
    step:  '01',
    title: 'Set your constraints',
    body:  'Input your faculty, rooms, courses, and preferences. Cadence understands your institution\'s rules — NEP 2020 credits, lab requirements, max workload.',
  },
  {
    icon:  <Zap size={28} color="var(--cadence-teal)" />,
    step:  '02',
    title: 'Let the AI work',
    body:  'Our three-stage engine — Louvain clustering, CP-SAT constraint solving, and Q-Learning refinement — produces an optimised schedule automatically.',
  },
  {
    icon:  <CheckSquare size={28} color="var(--cadence-teal)" />,
    step:  '03',
    title: 'Review and publish',
    body:  'Admins review the generated timetable, compare variants, and approve. Faculty and students see their schedule instantly.',
  },
]

export default function HomePage() {
  return (
    <div style={{ background: 'var(--cadence-off-white)' }}>

      {/* 1 — Hero ─────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* 2 — Social proof bar ────────────────────────────────────────────── */}
      <SocialProof />

      {/* 3 — Problem → Solution ──────────────────────────────────────────── */}
      <section style={{ background: 'white' }}>
        <div className="mk-section">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="mk-h2">
              Scheduling was broken.{' '}
              <span className="mk-text-gradient">We fixed it.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Old way */}
            <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px', fontWeight: 600, color: '#b91c1c', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  The old way
                </span>
              </h3>
              <ul className="flex flex-col gap-4">
                {OLD_WAY.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <X size={11} color="#dc2626" />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--cadence-slate)', lineHeight: '1.5' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Cadence way */}
            <div style={{ background: 'rgba(42,157,143,0.03)', border: '1px solid rgba(42,157,143,0.16)', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px', fontWeight: 600, color: 'var(--cadence-teal)', marginBottom: '24px' }}>
                <span style={{ background: 'rgba(42,157,143,0.10)', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  With Cadence
                </span>
              </h3>
              <ul className="flex flex-col gap-4">
                {CADENCE_WAY.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(42,157,143,0.12)', border: '1px solid rgba(42,157,143,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <Check size={11} color="#2A9D8F" />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--cadence-slate)', lineHeight: '1.5' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — How it works ────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--cadence-off-white)' }}>
        <div className="mk-section" style={{ textAlign: 'center' }}>
          <h2 className="mk-h2" style={{ marginBottom: '12px' }}>Three steps. One timetable.</h2>
          <p className="mk-body" style={{ marginBottom: '56px', maxWidth: '480px', margin: '0 auto 56px' }}>
            From setup to approved schedule in one session.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ position: 'relative' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: '16px' }}>
                <div className="mk-feature-card" style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(42,157,143,0.10)', border: '1px solid rgba(42,157,143,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step.icon}
                    </div>
                    <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '36px', fontWeight: 800, color: 'rgba(27,58,92,0.08)', lineHeight: 1 }}>
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mk-h3" style={{ fontSize: '20px', marginBottom: '12px' }}>{step.title}</h3>
                  <p className="mk-body-sm">{step.body}</p>
                </div>
                {/* Arrow connector */}
                {i < STEPS.length - 1 && (
                  <div className="mk-step-arrow" style={{ color: 'var(--cadence-teal)', opacity: 0.4, paddingTop: '20px' }}>
                    <ArrowRight size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Feature deep dive ───────────────────────────────────────────── */}
      <FeatureGrid />

      {/* 6 — Testimonial ─────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #0F1C2E 0%, #1B3A5C 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <Quote size={48} color="rgba(42,157,143,0.6)" style={{ marginBottom: '24px', margin: '0 auto 24px' }} />
          <blockquote style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(18px,2.5vw,22px)', fontWeight: 400, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', lineHeight: 1.65, marginBottom: '36px' }}>
            &ldquo;Before Cadence, our timetable process took the entire first week of the semester.
            Now our admin generates a conflict-free schedule for 4,000 students in under 10 minutes.
            The faculty preference feature alone saved us 50 emails per semester.&rdquo;
          </blockquote>
          <div>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
              Dr. Ananya Krishnan
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
              Dean of Academics, Institute of Technology, Bangalore
            </p>
          </div>
        </div>
      </section>

      {/* 7 — Pricing preview ─────────────────────────────────────────────── */}
      <section style={{ background: 'white' }}>
        <div className="mk-section">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="mk-h2" style={{ marginBottom: '12px' }}>Simple pricing. Institutional licensing.</h2>
            <p className="mk-body">Transparent tiers that scale with your institution.</p>
          </div>
          <PricingTable preview />
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link
              href="/pricing"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--cadence-teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              See all plans <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* 8 — Final CTA ───────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2A9D8F 100%)', padding: '100px 24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="mk-h2-white" style={{ marginBottom: '20px' }}>
            Ready to end scheduling chaos?
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,0.80)', marginBottom: '40px', lineHeight: 1.6 }}>
            Join 50+ institutions already running on Cadence.
            Get a personalised demo — we&apos;ll configure a test timetable
            for your actual institution data.
          </p>
          <Link
            href="/contact"
            className="mk-cta-lift"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            '10px',
              background:     'white',
              color:          'var(--cadence-navy)',
              border:         'none',
              borderRadius:   '10px',
              padding:        '16px 36px',
              fontFamily:     'Poppins, sans-serif',
              fontSize:       '17px',
              fontWeight:     700,
              textDecoration: 'none',
            }}
          >
            Book a Free Demo
            <ArrowRight size={18} />
          </Link>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginTop: '16px' }}>
            No commitment. No credit card. Live demo in 30 minutes.
          </p>
        </div>
      </section>
    </div>
  )
}
