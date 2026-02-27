'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const STARTER_FEATURES = [
  'Up to 500 students',
  'Up to 50 faculty',
  'Up to 3 departments',
  '10 timetable generations/month',
  'PDF export',
  'Email support',
]

const PRO_FEATURES = [
  'Everything in Starter',
  'Up to 5,000 students',
  'Unlimited faculty',
  'Unlimited departments',
  'Unlimited generations',
  'All export formats (Excel, CSV, ICS)',
  'Substitution engine',
  'Priority support (24h response)',
  '5 admin accounts',
]

const ENTERPRISE_FEATURES = [
  'Everything in Professional',
  'Unlimited students',
  'Unlimited generations',
  'REST API access',
  'SSO / LDAP integration',
  'Dedicated onboarding manager',
  'SLA guarantee (99.9% uptime)',
  'On-premise deployment option',
  'Custom integrations',
  'Unlimited admin accounts',
]

interface TierCardProps {
  name:       string
  price:      string
  priceNote?: string
  tagline:    string
  features:   string[]
  cta:        string
  ctaHref:    string
  featured?:  boolean
  annual:     boolean
}

function TierCard({ name, price, priceNote, tagline, features, cta, ctaHref, featured }: TierCardProps) {
  return (
    <div
      style={{
        background:   'white',
        borderRadius: '20px',
        border:       featured ? '2px solid var(--cadence-teal)' : '1px solid rgba(27,58,92,0.10)',
        padding:      '32px',
        display:      'flex',
        flexDirection: 'column',
        position:     'relative',
        boxShadow:    featured
          ? '0 0 0 4px rgba(42,157,143,0.08), 0 16px 48px rgba(42,157,143,0.12)'
          : '0 2px 12px rgba(27,58,92,0.05)',
        transform:    featured ? 'scale(1.02)' : 'none',
        zIndex:       featured ? 1 : 0,
      }}
    >
      {featured && (
        <div
          style={{
            position:   'absolute',
            top:        '-14px',
            left:       '50%',
            transform:  'translateX(-50%)',
            background: 'var(--cadence-teal)',
            color:      'white',
            borderRadius: '9999px',
            padding:    '4px 16px',
            fontFamily: 'Inter, sans-serif',
            fontSize:   '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          MOST POPULAR
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--cadence-ink)', marginBottom: '6px' }}>
          {name}
        </h3>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)', marginBottom: '20px' }}>
          {tagline}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '36px', fontWeight: 700, color: 'var(--cadence-navy)' }}>
            {price}
          </span>
          {priceNote && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)' }}>
              {priceNote}
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-3" style={{ flex: 1, marginBottom: '28px' }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Check size={15} style={{ color: 'var(--cadence-teal)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)' }}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '6px',
          padding:        '13px 24px',
          borderRadius:   '10px',
          fontFamily:     'Inter, sans-serif',
          fontSize:       '15px',
          fontWeight:     600,
          textDecoration: 'none',
          transition:     'all 150ms',
          background:     featured
            ? 'linear-gradient(135deg, #1B3A5C, #2A9D8F)'
            : 'transparent',
          color:   featured ? 'white' : 'var(--cadence-navy)',
          border:  featured ? 'none' : '1.5px solid var(--cadence-navy)',
        }}
        onMouseEnter={e => {
          if (!featured) {
            e.currentTarget.style.background = 'var(--cadence-navy)'
            e.currentTarget.style.color = 'white'
          }
        }}
        onMouseLeave={e => {
          if (!featured) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--cadence-navy)'
          }
        }}
      >
        {cta}
        <ArrowRight size={15} />
      </Link>
    </div>
  )
}

export function PricingTable({ preview = false }: { preview?: boolean }) {
  const [annual, setAnnual] = useState(true)
  const { ref, visible }    = useScrollReveal(0.1)

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`mk-reveal ${visible ? 'mk-reveal-visible' : 'mk-reveal-hidden'}`}
    >
      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: annual ? 400 : 600, color: !annual ? 'var(--cadence-ink)' : 'var(--cadence-slate)' }}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual(a => !a)}
          style={{
            width:        '52px',
            height:       '28px',
            borderRadius: '9999px',
            background:   annual ? 'var(--cadence-teal)' : 'rgba(27,58,92,0.15)',
            border:       'none',
            cursor:       'pointer',
            position:     'relative',
            transition:   'background 200ms',
          }}
          aria-label="Toggle billing period"
        >
          <div
            style={{
              position:     'absolute',
              top:          '3px',
              left:         annual ? '27px' : '3px',
              width:        '22px',
              height:       '22px',
              borderRadius: '50%',
              background:   'white',
              transition:   'left 200ms',
              boxShadow:    '0 1px 4px rgba(0,0,0,0.2)',
            }}
          />
        </button>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: annual ? 600 : 400, color: annual ? 'var(--cadence-ink)' : 'var(--cadence-slate)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Annual
          <span style={{ background: 'rgba(42,157,143,0.12)', color: 'var(--cadence-teal)', borderRadius: '9999px', padding: '2px 8px', fontSize: '12px', fontWeight: 700 }}>
            Save 20%
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <TierCard
          name="Starter"
          price="₹0"
          tagline="For small institutions getting started"
          features={STARTER_FEATURES}
          cta="Get Started Free"
          ctaHref="/contact"
          annual={annual}
        />
        <TierCard
          name="Professional"
          price={annual ? '₹3,999' : '₹4,999'}
          priceNote="/month"
          tagline="For growing universities"
          features={PRO_FEATURES}
          cta="Start Free Trial"
          ctaHref="/contact"
          featured
          annual={annual}
        />
        <TierCard
          name="Enterprise"
          price="Custom"
          tagline="For large institutions and university systems"
          features={ENTERPRISE_FEATURES}
          cta="Contact Sales"
          ctaHref="/contact"
          annual={annual}
        />
      </div>

      {!preview && (
        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)' }}>
          14-day free trial on Professional. No credit card required.
        </p>
      )}
    </div>
  )
}
