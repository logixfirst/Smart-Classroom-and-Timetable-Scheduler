import type { Metadata } from 'next'
import { PricingTable } from '@/components/marketing/PricingTable'

export const metadata: Metadata = {
  title:       'Pricing — Cadence',
  description: 'Simple, transparent pricing for institutions of every size. Start free, scale as you grow.',
}

const FAQS = [
  {
    q: 'Can we import our existing faculty and course data?',
    a: 'Yes. Cadence accepts CSV and Excel imports for faculty, courses, rooms, and departments. Our onboarding team will walk you through the import process during your demo.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most institutions are fully onboarded and generating their first timetable within one business day. Enterprise clients get a dedicated onboarding manager for a smooth transition.',
  },
  {
    q: 'What happens to our data if we cancel?',
    a: 'You can export all your data (timetables, faculty, courses) at any time. After cancellation, your data is retained for 30 days and then permanently deleted upon request.',
  },
  {
    q: 'Do you offer discounts for government institutions?',
    a: 'Yes. Government colleges, aided institutions, and public universities qualify for special pricing. Contact us to discuss your specific situation.',
  },
  {
    q: 'Is there a free trial for Professional?',
    a: 'Yes. Every Professional account starts with a 14-day free trial — no credit card required. You get full access to all features.',
  },
  {
    q: 'Can we self-host Cadence?',
    a: 'On-premise deployment is available on the Enterprise tier. We provide a Docker-based deployment package and technical support for your infrastructure team.',
  },
]

export default function PricingPage() {
  return (
    <div style={{ background: 'var(--cadence-off-white)' }}>

      {/* Hero */}
      <section style={{ background: 'white', borderBottom: '1px solid rgba(27,58,92,0.08)', textAlign: 'center', padding: '72px 24px 56px' }}>
        <span className="mk-eyebrow" style={{ marginBottom: '16px' }}>Pricing</span>
        <h1 className="mk-h1" style={{ marginBottom: '16px' }}>
          Simple pricing.{' '}
          <span className="mk-text-gradient">Institutional licensing.</span>
        </h1>
        <p className="mk-body" style={{ maxWidth: '560px', margin: '0 auto' }}>
          Transparent tiers that grow with your institution.
          No hidden fees. No per-user charges. Just one flat plan.
        </p>
      </section>

      {/* Pricing table */}
      <section style={{ background: 'var(--cadence-off-white)' }}>
        <div className="mk-section">
          <PricingTable />
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'white' }}>
        <div className="mk-section" style={{ maxWidth: '720px' }}>
          <h2 className="mk-h2" style={{ textAlign: 'center', marginBottom: '48px' }}>Frequently asked questions</h2>
          <div className="flex flex-col gap-0">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2A9D8F 100%)', padding: '72px 24px', textAlign: 'center' }}>
        <h2 className="mk-h2-white" style={{ marginBottom: '16px' }}>Still have questions?</h2>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'rgba(255,255,255,0.75)', marginBottom: '32px' }}>
          Talk to our team — we&apos;ll find the right plan for your institution.
        </p>
        <a href="/contact" className="mk-btn-primary" style={{ fontSize: '16px', padding: '14px 32px', background: 'white', color: 'var(--cadence-navy)' }}>
          Talk to Sales
        </a>
      </section>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  // Using details/summary for native accordion (no JS required, SSR-safe)
  return (
    <details
      style={{ borderBottom: '1px solid rgba(27,58,92,0.08)' }}
    >
      <summary
        style={{
          fontFamily:   'Inter, sans-serif',
          fontSize:     '16px',
          fontWeight:   600,
          color:        'var(--cadence-ink)',
          padding:      '20px 0',
          cursor:       'pointer',
          listStyle:    'none',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          gap:          '16px',
        }}
      >
        {q}
        <span style={{ flexShrink: 0, color: 'var(--cadence-teal)' }}>＋</span>
      </summary>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--cadence-slate)', lineHeight: 1.7, paddingBottom: '20px', marginTop: '-4px' }}>
        {a}
      </p>
    </details>
  )
}
