import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, User } from 'lucide-react'

export const metadata: Metadata = {
  title:       'Blog — Cadence',
  description: 'Insights on academic scheduling, AI in education, and institutional operations.',
}

const ARTICLES = [
  {
    slug:    'ai-timetabling-vs-manual',
    tag:     'AI',
    tagClass: 'mk-tag-ai',
    title:   'Why AI Timetabling Beats Manual Scheduling Every Time',
    excerpt: 'Manual timetabling is a painful, error-prone process that steals days from administrators every semester. Here is why the AI alternative is not just better — it is categorically different.',
    author:  'Aryan Sharma',
    date:    'Feb 12, 2026',
    readTime: '7 min read',
    featured: true,
  },
  {
    slug:    'nep-2020-flexible-credits',
    tag:     'Education Policy',
    tagClass: 'mk-tag-policy',
    title:   'NEP 2020 and the Challenge of Flexible Credit Systems',
    excerpt: 'India\'s National Education Policy 2020 mandates flexibility in course selection and credit accumulation. Timetabling software built for rigid semester structures cannot cope.',
    author:  'Kavya Nair',
    date:    'Feb 5, 2026',
    readTime: '9 min read',
    featured: false,
  },
  {
    slug:    'zero-conflicts-with-cpsat',
    tag:     'Product',
    tagClass: 'mk-tag-product',
    title:   'How We Reduced Timetable Conflicts to Zero Using CP-SAT',
    excerpt: 'A deep dive into how Google OR-Tools\' CP-SAT solver makes conflict-free scheduling mathematically guaranteed — not just statistically likely.',
    author:  'Aryan Sharma',
    date:    'Jan 28, 2026',
    readTime: '12 min read',
    featured: false,
  },
  {
    slug:    'hidden-cost-manual-scheduling',
    tag:     'Education',
    tagClass: 'mk-tag-education',
    title:   'The Hidden Cost of Manual Academic Scheduling',
    excerpt: 'Beyond the obvious time drain, manual timetabling creates cascading costs: faculty dissatisfaction, room under-utilisation, and a bias towards whoever complains the loudest.',
    author:  'Priya Menon',
    date:    'Jan 20, 2026',
    readTime: '6 min read',
    featured: false,
  },
  {
    slug:    'substitution-management-problem',
    tag:     'Product',
    tagClass: 'mk-tag-product',
    title:   'Substitution Management: The Problem Nobody Talks About',
    excerpt: 'Faculty absences are the most disruptive event in a semester schedule. And yet, almost no timetabling software has a proper substitution engine. Here is why it matters.',
    author:  'Rohan Iyer',
    date:    'Jan 14, 2026',
    readTime: '8 min read',
    featured: false,
  },
]

export default function BlogIndexPage() {
  const featured    = ARTICLES[0]
  const remaining   = ARTICLES.slice(1)

  return (
    <div style={{ background: 'var(--cadence-off-white)' }}>
      {/* Hero */}
      <section style={{ background: 'white', borderBottom: '1px solid rgba(27,58,92,0.08)', padding: '72px 24px 56px', textAlign: 'center' }}>
        <span className="mk-eyebrow">The Cadence Blog</span>
        <h1 className="mk-h1" style={{ margin: '8px auto 16px', maxWidth: '600px' }}>
          Insights on academic scheduling and AI education.
        </h1>
        <p className="mk-body" style={{ maxWidth: '480px', margin: '0 auto' }}>
          Articles on AI, operational efficiency, education policy, and the future of academic administration.
        </p>
      </section>

      <div className="mk-section">
        {/* Featured article */}
        <div style={{ marginBottom: '48px' }}>
          <Link
            href={`/blog/${featured.slug}`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div className="mk-hover-card" style={{ background: 'white', borderRadius: '20px', overflow: 'hidden' }}>
              {/* Featured image placeholder */}
              <div style={{ height: '240px', background: 'linear-gradient(135deg, var(--cadence-navy) 0%, var(--cadence-teal) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Featured Article
                </span>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span className={`mk-tag ${featured.tagClass}`}>{featured.tag}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'rgba(42,157,143,0.8)', background: 'rgba(42,157,143,0.08)', padding: '2px 10px', borderRadius: '9999px' }}>
                    Featured
                  </span>
                </div>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--cadence-ink)', marginBottom: '12px', lineHeight: 1.3 }}>
                  {featured.title}
                </h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: 'var(--cadence-slate)', lineHeight: 1.65, marginBottom: '20px', maxWidth: '640px' }}>
                  {featured.excerpt}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="var(--cadence-slate)" />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--cadence-slate)' }}>{featured.author}</span>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--cadence-slate)' }}>{featured.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} color="var(--cadence-slate)" />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--cadence-slate)' }}>{featured.readTime}</span>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--cadence-teal)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                    Read more <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {remaining.map(article => (
            <Link key={article.slug} href={`/blog/${article.slug}`} className="mk-blog-card" style={{ textDecoration: 'none' }}>
              {/* Article colour band */}
              <div style={{ height: '6px', background: 'linear-gradient(90deg, var(--cadence-navy), var(--cadence-teal))' }} />
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span className={`mk-tag ${article.tagClass}`} style={{ alignSelf: 'flex-start', marginBottom: '12px' }}>
                  {article.tag}
                </span>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px', fontWeight: 600, color: 'var(--cadence-ink)', lineHeight: 1.4, marginBottom: '10px', flex: 1 }}>
                  {article.title}
                </h3>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)', lineHeight: 1.6, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {article.excerpt}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid rgba(27,58,92,0.06)', paddingTop: '12px' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)' }}>{article.author}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)' }}>·</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)' }}>{article.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                    <Clock size={12} color="var(--cadence-slate)" />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cadence-slate)' }}>{article.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
