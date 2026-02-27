import type { Metadata } from 'next'
import Link from 'next/link'
import { Eye, Heart, Layers, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title:       'Company — Cadence',
  description: 'Built by engineers who watched academic administrators struggle with spreadsheets for too long. Here is why we built Cadence.',
}

const TEAM = [
  { name: 'Aryan Sharma',    role: 'AI & Algorithms',         initials: 'AS', color: '#1B3A5C' },
  { name: 'Priya Menon',     role: 'Backend Engineering',     initials: 'PM', color: '#2A9D8F' },
  { name: 'Rohan Iyer',      role: 'Frontend Engineering',    initials: 'RI', color: '#1E4D6B' },
  { name: 'Kavya Nair',      role: 'Product & UX',            initials: 'KN', color: '#0369a1' },
  { name: 'Dev Patel',       role: 'Infrastructure & DevOps', initials: 'DP', color: '#0f766e' },
  { name: 'Aisha Krishnan',  role: 'Data Science & RL',       initials: 'AK', color: '#6d28d9' },
]

const TIMELINE = [
  { year: 'Aug 2024', label: 'Origin',          desc: 'Built for Smart India Hackathon 2024 — 36 hours, one scheduling problem, one team obsession.' },
  { year: 'Oct 2024', label: 'First pilot',     desc: 'First institutional pilot with a 1,200-student engineering college in Karnataka.' },
  { year: 'Dec 2024', label: 'CP-SAT upgrade',  desc: 'Replaced the manual constraint system with Google OR-Tools CP-SAT — 10× speedup.' },
  { year: 'Feb 2025', label: 'RL layer added',  desc: 'Q-Learning refinement stage added. Faculty satisfaction scores improved by 34%.' },
  { year: 'Jun 2025', label: 'Multi-tenant',    desc: 'Multi-tenant architecture launched. 15 institutions onboarded in the first month.' },
  { year: 'Jan 2026', label: 'Cadence launch',  desc: 'Rebranded as Cadence. Public launch with 50+ institutions across India.' },
]

const VALUES = [
  {
    icon:   <Eye size={24} color="var(--cadence-teal)" />,
    title:  'Transparency',
    body:   'No black-box scheduling. Every timetable decision by Cadence is explainable — the constraints it satisfied, the preferences it balanced, the score it achieved.',
  },
  {
    icon:   <Heart size={24} color="var(--cadence-teal)" />,
    title:  'Respect for educators',
    body:   'Faculty preferences are not optional extras — they are first-class constraints. Scheduling that ignores people is scheduling that fails. We refuse to build that.',
  },
  {
    icon:   <Layers size={24} color="var(--cadence-teal)" />,
    title:  'Simplicity at scale',
    body:   'Behind Cadence is some of the most complex constraint optimization in enterprise software. In front of it is a UI that any admin can learn in under an hour.',
  },
]

export default function CompanyPage() {
  return (
    <div style={{ background: 'var(--cadence-off-white)' }}>

      {/* Mission */}
      <section style={{ background: 'linear-gradient(135deg, #0F1C2E 0%, #1B3A5C 100%)', padding: '80px 24px 72px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <span className="mk-eyebrow" style={{ background: 'rgba(42,157,143,0.2)', borderColor: 'rgba(42,157,143,0.4)', color: '#3BBFB0' }}>
            Our Mission
          </span>
          <h1 className="mk-h1-white" style={{ marginTop: '8px', marginBottom: '24px' }}>
            Scheduling should never be the obstacle to learning.
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
            We built Cadence because we watched academic administrators spend the first two weeks
            of every semester fighting spreadsheets instead of focusing on students.
            We believed a better way was possible. It was.
          </p>
        </div>
      </section>

      {/* Technology (plain language) */}
      <section style={{ background: 'white' }}>
        <div className="mk-section" style={{ maxWidth: '760px', textAlign: 'center' }}>
          <span className="mk-eyebrow">The Technology</span>
          <h2 className="mk-h2" style={{ marginBottom: '24px' }}>
            Complex maths. Simple outcome.
          </h2>
          <div style={{ textAlign: 'left' }}>
            <p className="mk-body" style={{ marginBottom: '20px' }}>
              The same kind of optimisation that routes 10 million Amazon packages per day
              helps Cadence ensure no professor teaches two classes at once. It&apos;s called
              constraint satisfaction programming — and Google uses it to organise the world&apos;s
              largest logistics networks.
            </p>
            <p className="mk-body" style={{ marginBottom: '20px' }}>
              On top of that, we added a reinforcement learning agent — the same class of AI
              that taught itself to play chess at grandmaster level — to learn your institution&apos;s
              scheduling preferences and maximise faculty satisfaction over time.
            </p>
            <p className="mk-body">
              The result: a timetable that is not just conflict-free, but one that your
              faculty will actually prefer. That distinction matters.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ background: 'var(--cadence-off-white)' }}>
        <div className="mk-section">
          <h2 className="mk-h2" style={{ textAlign: 'center', marginBottom: '48px' }}>The team</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {TEAM.map(member => (
              <div key={member.name} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width:        '72px',
                    height:       '72px',
                    borderRadius: '50%',
                    background:   member.color,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    fontFamily:   'Poppins, sans-serif',
                    fontSize:     '20px',
                    fontWeight:   700,
                    color:        'white',
                    margin:       '0 auto 12px',
                    boxShadow:    `0 4px 16px ${member.color}40`,
                  }}
                >
                  {member.initials}
                </div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--cadence-ink)', marginBottom: '4px' }}>
                  {member.name}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)', lineHeight: 1.4 }}>
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ background: 'white' }}>
        <div className="mk-section" style={{ maxWidth: '760px' }}>
          <h2 className="mk-h2" style={{ textAlign: 'center', marginBottom: '48px' }}>How we got here</h2>
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: '8px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(42,157,143,0.2)', borderRadius: '2px' }} />
            {TIMELINE.map((item, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: i < TIMELINE.length - 1 ? '36px' : 0 }}>
                {/* Dot */}
                <div style={{ position: 'absolute', left: '-28px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--cadence-teal)', border: '3px solid white', boxShadow: '0 0 0 2px rgba(42,157,143,0.3)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--cadence-teal)', letterSpacing: '0.04em' }}>
                    {item.year}
                  </span>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 600, color: 'var(--cadence-ink)' }}>
                    {item.label}
                  </span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--cadence-slate)', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: 'var(--cadence-off-white)' }}>
        <div className="mk-section">
          <h2 className="mk-h2" style={{ textAlign: 'center', marginBottom: '48px' }}>What we believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="mk-feature-card" style={{ textAlign: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(42,157,143,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  {v.icon}
                </div>
                <h3 className="mk-h3" style={{ fontSize: '20px', marginBottom: '12px' }}>{v.title}</h3>
                <p className="mk-body-sm">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2A9D8F 100%)', padding: '72px 24px', textAlign: 'center' }}>
        <h2 className="mk-h2-white" style={{ marginBottom: '16px' }}>Want to work with us?</h2>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'rgba(255,255,255,0.75)', marginBottom: '32px' }}>
          We&apos;re always looking for people who care about education and love hard problems.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/contact" className="mk-btn-primary" style={{ background: 'white', color: 'var(--cadence-navy)' }}>
            Get in Touch <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
