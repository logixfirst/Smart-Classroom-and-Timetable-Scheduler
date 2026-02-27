import type { Metadata } from 'next'
import { Mail, Phone, Clock, Shield } from 'lucide-react'
import { DemoRequestForm } from '@/components/marketing/DemoRequestForm'

export const metadata: Metadata = {
  title:       'Book a Demo — Cadence',
  description: 'See Cadence in action. Book a 30-minute live demo and watch us generate a timetable from your institution\'s real data.',
}

const DEMO_HIGHLIGHTS = [
  'Full timetable generation for a sample department',
  'Faculty preference configuration',
  'Conflict detection and resolution',
  'Export to PDF and Excel',
  'The substitution engine',
]

export default function ContactPage() {
  return (
    <div style={{ background: 'var(--cadence-off-white)' }}>
      <div className="mk-section" style={{ maxWidth: '1100px', paddingTop: '60px', paddingBottom: '80px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Left panel — 60% (3/5 cols) */}
          <div className="lg:col-span-3">
            <span className="mk-eyebrow">Book a Demo</span>
            <h1 className="mk-h1" style={{ marginBottom: '16px' }}>
              See Cadence{' '}
              <span className="mk-text-gradient">in action.</span>
            </h1>
            <p className="mk-body" style={{ maxWidth: '480px', marginBottom: '32px' }}>
              Book a 30-minute live demo. We&apos;ll use your institution&apos;s actual parameters
              to generate a sample timetable — live, during the call.
            </p>

            <div style={{ marginBottom: '36px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--cadence-navy)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                What you will see:
              </p>
              <ul className="flex flex-col gap-3">
                {DEMO_HIGHLIGHTS.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cadence-teal)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--cadence-slate)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form */}
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(27,58,92,0.08)', padding: '32px', boxShadow: '0 4px 24px rgba(27,58,92,0.06)' }}>
              <DemoRequestForm />
            </div>
          </div>

          {/* Right panel — 40% (2/5 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Contact info */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(27,58,92,0.08)', padding: '28px' }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '17px', fontWeight: 600, color: 'var(--cadence-ink)', marginBottom: '20px' }}>
                Get in touch
              </h3>
              <div className="flex flex-col gap-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(42,157,143,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={16} color="var(--cadence-teal)" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)', marginBottom: '2px' }}>Email</p>
                    <a href="mailto:hello@cadence.edu" style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--cadence-navy)', textDecoration: 'none' }}>
                      hello@cadence.edu
                    </a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(42,157,143,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={16} color="var(--cadence-teal)" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)', marginBottom: '2px' }}>Phone</p>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--cadence-navy)' }}>
                      +91 XXXXX XXXXX
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Response time */}
            <div style={{ background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Clock size={20} color="var(--cadence-teal)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--cadence-teal)', marginBottom: '2px' }}>
                  We respond within 2 hours
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--cadence-slate)' }}>
                  On business days (Mon–Sat, 9am–6pm IST)
                </p>
              </div>
            </div>

            {/* Mini testimonial */}
            <div style={{ background: 'linear-gradient(135deg, rgba(27,58,92,0.04), rgba(42,157,143,0.06))', border: '1px solid rgba(27,58,92,0.08)', borderRadius: '14px', padding: '24px' }}>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontStyle: 'italic', color: 'var(--cadence-ink)', lineHeight: 1.6, marginBottom: '14px' }}>
                &ldquo;The demo was incredibly tailored — they loaded our actual semester data
                and generated a real schedule live on the call. We signed up the same day.&rdquo;
              </p>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--cadence-navy)' }}>Prof. Rajan Mehta</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)' }}>HOD Computer Science, NMIT</p>
              </div>
            </div>

            {/* Security note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'white', border: '1px solid rgba(27,58,92,0.08)', borderRadius: '12px' }}>
              <Shield size={16} color="var(--cadence-slate)" style={{ flexShrink: 0 }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--cadence-slate)', lineHeight: 1.5 }}>
                Your data is safe. We never share contact information with third parties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
