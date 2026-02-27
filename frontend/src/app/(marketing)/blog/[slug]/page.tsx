import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react'

// Static blog content — replace with MDX or CMS later
const ARTICLES: Record<string, {
  title:    string
  tag:      string
  tagClass: string
  author:   string
  date:     string
  readTime: string
  content:  React.ReactNode
}> = {
  'ai-timetabling-vs-manual': {
    title:   'Why AI Timetabling Beats Manual Scheduling Every Time',
    tag:     'AI',
    tagClass: 'mk-tag-ai',
    author:  'Aryan Sharma',
    date:    'February 12, 2026',
    readTime: '7 min read',
    content: (
      <>
        <p>Manual timetabling is a painful, error-prone process that steals days from administrators every semester. Here is why the AI alternative is not just better — it is categorically different.</p>
        <h2>The core problem with manual timetabling</h2>
        <p>When an administrator builds a timetable by hand, they are solving what computer scientists call a <strong>constraint satisfaction problem</strong> — a problem that is provably NP-hard. That means the time required to find an optimal solution grows exponentially with the number of constraints.</p>
        <p>For a small institution with 500 students and 40 faculty, there are more possible timetable configurations than there are atoms in the observable universe. An experienced timetabling administrator uses decades of heuristics — intuition built from years of trial and error — to find a workable solution. But &quot;workable&quot; is not the same as &quot;optimal.&quot;</p>
        <h2>What AI actually does differently</h2>
        <p>Cadence uses Google OR-Tools CP-SAT solver — a branch-and-bound constraint propagation engine — to search that vast solution space systematically. Unlike a human, it never fatigues. It never misses a constraint. It never accidentally double-books a room because it forgot about a change made three hours earlier.</p>
        <p>More importantly, it optimises for multiple objectives simultaneously: zero hard constraint violations, maximum faculty preference satisfaction, and balanced room utilisation. A human timetabler, with limited cognitive bandwidth, typically optimises for one thing at a time — and the others suffer.</p>
        <h2>The time argument</h2>
        <p>In our pilot institutions, the average manual timetabling process took <strong>4.2 working days</strong> per semester. With Cadence, the same institution generates a feasible, optimised timetable in <strong>4 to 8 minutes</strong>. That is not a marginal improvement. That is a fundamentally different type of process.</p>
        <h2>The quality argument</h2>
        <p>Time savings matter, but quality matters more. In manual timetables, conflicts are discovered after distribution — during the first week of the semester when students start attending classes. The disruption from post-distribution conflict resolution is enormous: re-printed timetables, confused faculty, students missing classes.</p>
        <p>Cadence&apos;s zero-conflict guarantee is mathematically enforced at the constraint level. It is not that conflicts are unlikely to exist in the generated timetable. It is that the solver is literally incapable of producing a solution that violates a hard constraint.</p>
      </>
    ),
  },
  'nep-2020-flexible-credits': {
    title:   'NEP 2020 and the Challenge of Flexible Credit Systems',
    tag:     'Education Policy',
    tagClass: 'mk-tag-policy',
    author:  'Kavya Nair',
    date:    'February 5, 2026',
    readTime: '9 min read',
    content: (
      <>
        <p>India&apos;s National Education Policy 2020 mandates flexibility in course selection and credit accumulation. Timetabling software built for rigid semester structures cannot cope.</p>
        <h2>The NEP 2020 challenge</h2>
        <p>The NEP&apos;s flexible credit framework allows students to choose electives across departments, accumulate credits over multiple years, and pursue interdisciplinary programmes. For a timetabling system, this creates a combinatorial explosion of scheduling dependencies that traditional tools simply were not designed to handle.</p>
        <h2>How Cadence handles cross-departmental scheduling</h2>
        <p>Cadence models student enrolments as hard constraints at the batch level. When a student from the Computer Science department enrolls in a Physics elective, the system automatically ensures their existing CS schedule does not conflict with the Physics timeslot — and vice versa.</p>
        <p>This sounds simple, but at scale — with 2,000 students taking electives across 8 departments — it produces millions of constraint pairs that must all be simultaneously satisfied. Only a formal solver can handle this correctly.</p>
      </>
    ),
  },
}

// Fallback for unknown slugs
const DEFAULT_ARTICLE = {
  title:   'Article Not Found',
  tag:     'Blog',
  tagClass: 'mk-tag-product',
  author:  'Cadence Team',
  date:    'February 2026',
  readTime: '—',
  content: <p>This article is coming soon. Check back shortly.</p>,
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = ARTICLES[params.slug]
  return {
    title:       article ? `${article.title} — Cadence Blog` : 'Blog — Cadence',
    description: article ? `Read ${article.title} on the Cadence blog.` : '',
  }
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const article = ARTICLES[params.slug] ?? DEFAULT_ARTICLE

  return (
    <div style={{ background: 'white' }}>
      {/* Header */}
      <section style={{ background: 'linear-gradient(135deg, var(--cadence-navy) 0%, var(--cadence-teal) 100%)', padding: '64px 24px 56px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', marginBottom: '24px' }}>
            <ArrowLeft size={14} /> Back to Blog
          </Link>
          <span className={`mk-tag ${article.tagClass}`} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '9999px', marginBottom: '16px', display: 'inline-block' }}>
            {article.tag}
          </span>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: '24px' }}>
            {article.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} color="rgba(255,255,255,0.65)" />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{article.author}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} color="rgba(255,255,255,0.65)" />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{article.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} color="rgba(255,255,255,0.65)" />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{article.readTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <div
          style={{
            fontFamily:  'Inter, sans-serif',
            fontSize:    '17px',
            lineHeight:  1.75,
            color:       'var(--cadence-slate)',
          }}
          className="[&_h2]:font-semibold [&_h2]:text-[var(--cadence-ink)] [&_h2]:[font-family:Poppins,sans-serif] [&_h2]:text-[24px] [&_h2]:mt-[40px] [&_h2]:mb-[16px]
                     [&_p]:mb-[20px] [&_strong]:font-semibold [&_strong]:text-[var(--cadence-ink)]
                     [&_ul]:list-disc [&_ul]:pl-[24px] [&_ul]:mb-[20px]
                     [&_li]:mb-[8px]"
        >
          {article.content}
        </div>

        {/* CTA */}
        <div style={{ marginTop: '56px', background: 'var(--cadence-off-white)', border: '1px solid rgba(27,58,92,0.08)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--cadence-ink)', marginBottom: '12px' }}>
            Ready to see this in action?
          </h3>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: 'var(--cadence-slate)', marginBottom: '24px' }}>
            Book a free 30-minute demo — we&apos;ll generate a real timetable using your institution&apos;s parameters.
          </p>
          <Link href="/contact" className="mk-btn-primary" style={{ fontSize: '15px', padding: '12px 28px' }}>
            Book a Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
