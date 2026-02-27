import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Brain, Users, AlertTriangle, RefreshCw, Download, Lock,
  Check, ArrowRight, Cpu, GitBranch, BarChart2
} from 'lucide-react'

export const metadata: Metadata = {
  title:       'Product — Cadence',
  description: 'Every feature your institution needs. AI timetable generation, conflict detection, substitution engine, and more.',
}

const FEATURES = [
  {
    id:     'ai-generation',
    icon:   <Brain size={24} color="var(--cadence-teal)" />,
    title:  'AI Timetable Generation',
    items: [
      { label: 'Louvain Clustering',     desc: 'Groups interdependent courses and faculty into clusters, reducing the scheduling problem size by up to 80% before the constraint solver runs.' },
      { label: 'CP-SAT Solver',         desc: 'Google OR-Tools handles hard constraints — no overlaps, no double-booking. Used in global logistics. Applied to your timetable.' },
      { label: 'Genetic Algorithm',      desc: 'For large institutions (>5,000 students), Cadence switches to a GA population-based search for faster feasible solutions.' },
      { label: 'Q-Learning Refinement', desc: 'A reinforcement learning agent refines soft constraints — faculty preferences, utilisation balance — over successive generations.' },
    ],
  },
  {
    id:     'multi-role',
    icon:   <Users size={24} color="var(--cadence-teal)" />,
    title:  'Multi-Role Access',
    items: [
      { label: 'Admin',   desc: 'Full control — CRUD operations on all entities, timetable generation, approvals, export, and audit logs.' },
      { label: 'Faculty', desc: 'Personal schedule view, availability settings, preference input, and absence marking.' },
      { label: 'Student', desc: 'Personal timetable view by enrolled courses. Read-only, always up to date.' },
    ],
  },
  {
    id:     'conflict-detection',
    icon:   <AlertTriangle size={24} color="var(--cadence-teal)" />,
    title:  'Conflict Detection',
    items: [
      { label: 'Faculty double-booking', desc: 'Detected at the constraint level — physically impossible to generate a conflicting assignment.' },
      { label: 'Room conflicts',         desc: 'Room capacity and availability enforced as hard constraints.' },
      { label: 'Batch overlaps',         desc: 'Student batch isolation ensures no student has two classes simultaneously.' },
      { label: 'Visual conflict map',    desc: 'The timetable editor highlights conflicting cells in red for manual overrides.' },
    ],
  },
  {
    id:     'substitution',
    icon:   <RefreshCw size={24} color="var(--cadence-teal)" />,
    title:  'Substitution Engine',
    items: [
      { label: 'Mark-absent flow',      desc: 'Admin marks a faculty member absent. Cadence instantly queries all constraints.' },
      { label: 'Confidence scoring',    desc: 'Suggestions are ranked High / Medium / Low based on subject expertise, workload, and schedule fit.' },
      { label: 'One-click assignment',  desc: 'Approve a suggestion in a single click. The affected schedule updates instantly.' },
      { label: 'Full audit trail',      desc: 'Every substitution is logged — who approved it, when, and for which class.' },
    ],
  },
  {
    id:     'export',
    icon:   <Download size={24} color="var(--cadence-teal)" />,
    title:  'Export and Integration',
    items: [
      { label: 'PDF export',     desc: 'Formatted timetable PDF, ready to print and distribute.' },
      { label: 'Excel / CSV',    desc: 'Full data export for integration with existing institutional software.' },
      { label: 'ICS calendar',   desc: 'Faculty and students can subscribe to their personal schedule via any calendar app.' },
      { label: 'REST API',       desc: 'Enterprise tier exposes a full REST API for custom integration with ERP and SIS systems.' },
    ],
  },
  {
    id:     'security',
    icon:   <Lock size={24} color="var(--cadence-teal)" />,
    title:  'Security and Compliance',
    items: [
      { label: 'HttpOnly JWT cookies',    desc: 'No tokens in localStorage. XSS-resistant authentication by design.' },
      { label: 'Argon2 password hashing', desc: 'Industry-leading password hash algorithm — not bcrypt, not SHA.' },
      { label: 'Role-based access control', desc: 'Granular permissions at the route level. Admins cannot access student data and vice versa.' },
      { label: 'Audit logging',           desc: 'Every create, update, and delete is timestamped and attributed to a user.' },
    ],
  },
]

const TECH_SPECS: { label: string; value: string }[] = [
  { label: 'Backend',     value: 'Django 4.x + FastAPI' },
  { label: 'Database',    value: 'PostgreSQL' },
  { label: 'Cache',       value: 'Redis' },
  { label: 'Auth',        value: 'JWT (HttpOnly cookies) + rotating refresh tokens' },
  { label: 'Deployment',  value: 'Docker / cloud-native' },
  { label: 'API',         value: 'REST with JSON' },
  { label: 'Real-time',   value: 'Server-Sent Events (SSE)' },
  { label: 'Algorithm',   value: 'CP-SAT (Google OR-Tools) + Genetic Algorithm + Q-Learning' },
]

export default function ProductPage() {
  return (
    <div style={{ background: 'var(--cadence-off-white)' }}>

      {/* Hero */}
      <section style={{ background: 'white', borderBottom: '1px solid rgba(27,58,92,0.08)', textAlign: 'center', padding: '72px 24px 56px' }}>
        <span className="mk-eyebrow">Platform Overview</span>
        <h1 className="mk-h1" style={{ marginBottom: '16px' }}>
          The complete academic{' '}
          <span className="mk-text-gradient">scheduling platform.</span>
        </h1>
        <p className="mk-body" style={{ maxWidth: '580px', margin: '0 auto 32px' }}>
          Every feature your institution needs. Nothing it doesn&apos;t.
          Built by engineers who understand both AI and academic operations.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/contact" className="mk-btn-primary">Request a Demo <ArrowRight size={16} /></Link>
          <Link href="/pricing" className="mk-btn-secondary">See pricing</Link>
        </div>
      </section>

      {/* Feature sections */}
      {FEATURES.map((feature, idx) => (
        <section
          key={feature.id}
          id={feature.id}
          style={{ background: idx % 2 === 0 ? 'var(--cadence-off-white)' : 'white' }}
        >
          <div className="mk-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(42,157,143,0.10)', border: '1px solid rgba(42,157,143,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {feature.icon}
              </div>
              <h2 className="mk-h2" style={{ fontSize: '28px' }}>{feature.title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
              {feature.items.map(item => (
                <div key={item.label} className="mk-feature-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Check size={15} color="var(--cadence-teal)" />
                    <h4 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--cadence-ink)' }}>
                      {item.label}
                    </h4>
                  </div>
                  <p className="mk-body-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Algorithm pipeline visual */}
      <section style={{ background: 'linear-gradient(135deg, #0F1C2E 0%, #1B3A5C 100%)', padding: '72px 24px' }}>
        <div className="mk-section" style={{ maxWidth: '900px' }}>
          <h2 className="mk-h2-white" style={{ textAlign: 'center', marginBottom: '12px' }}>The three-stage AI pipeline</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: '48px' }}>
            Each stage builds on the last. Speed and quality, not a trade-off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <GitBranch size={22} color="#2A9D8F" />, stage: 'Stage 1', name: 'Louvain Clustering', desc: 'Partitions the scheduling graph into smaller sub-problems. Reduces solver complexity from exponential to manageable.' },
              { icon: <Cpu size={22} color="#2A9D8F" />, stage: 'Stage 2', name: 'CP-SAT Solving', desc: 'Google OR-Tools resolves all hard constraints. Guaranteed zero faculty conflicts, room conflicts, and batch overlaps.' },
              { icon: <BarChart2 size={22} color="#2A9D8F" />, stage: 'Stage 3', name: 'Q-Learning Polish', desc: 'A RL agent maximises soft constraint satisfaction — faculty preference scores — within the feasible solution space.' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(42,157,143,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon}
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(42,157,143,0.8)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {s.stage}
                  </span>
                </div>
                <h4 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '10px' }}>{s.name}</h4>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical specs */}
      <section id="api" style={{ background: 'white' }}>
        <div className="mk-section" style={{ maxWidth: '760px' }}>
          <h2 className="mk-h2" style={{ textAlign: 'center', marginBottom: '40px' }}>Technical specifications</h2>
          <div style={{ border: '1px solid rgba(27,58,92,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            {TECH_SPECS.map((spec, i) => (
              <div
                key={spec.label}
                style={{
                  display:    'flex',
                  padding:    '16px 24px',
                  borderBottom: i < TECH_SPECS.length - 1 ? '1px solid rgba(27,58,92,0.06)' : 'none',
                  background: i % 2 === 0 ? 'white' : 'rgba(244,246,248,0.5)',
                  gap:        '16px',
                  flexWrap:   'wrap',
                }}
              >
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--cadence-navy)', minWidth: '140px', flexShrink: 0 }}>
                  {spec.label}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: 'var(--cadence-slate)' }}>
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'var(--cadence-off-white)', padding: '72px 24px', textAlign: 'center' }}>
        <h2 className="mk-h2" style={{ marginBottom: '16px' }}>See it work on your data.</h2>
        <p className="mk-body" style={{ marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px' }}>
          Book a demo and we&apos;ll run the full AI pipeline on a sample from your institution.
        </p>
        <Link href="/contact" className="mk-btn-primary" style={{ fontSize: '16px', padding: '14px 32px' }}>
          Book a Free Demo <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  )
}
