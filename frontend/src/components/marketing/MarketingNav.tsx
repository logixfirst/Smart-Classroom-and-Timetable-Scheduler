'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ArrowRight } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Product',  href: '/product' },
  { label: 'Pricing',  href: '/pricing' },
  { label: 'Company',  href: '/company' },
  { label: 'Blog',     href: '/blog'    },
]

export function MarketingNav() {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const pathname                  = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // close overlay whenever route changes
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // lock body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      {/* ── Desktop / sticky nav bar ─────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: '64px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: scrolled
            ? '1px solid rgba(27,58,92,0.12)'
            : '1px solid transparent',
          boxShadow: scrolled
            ? '0 1px 12px rgba(27,58,92,0.08)'
            : 'none',
        }}
      >
        <nav className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-decoration-none" aria-label="Cadence home">
            {/* SVG C-arc mark */}
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#1B3A5C" />
                  <stop offset="50%"  stopColor="#1E4D6B" />
                  <stop offset="100%" stopColor="#2A9D8F" />
                </linearGradient>
              </defs>
              {/* Outer arc */}
              <path stroke="url(#logo-grad)" strokeWidth="3.5" fill="none" strokeLinecap="round"
                d="M33 12 A15 15 0 1 0 33 28" />
              {/* Mid arc */}
              <path stroke="url(#logo-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round"
                d="M28 13.5 A10 10 0 1 0 28 26.5" />
              {/* Inner arc */}
              <path stroke="#2A9D8F" strokeWidth="2" fill="none" strokeLinecap="round"
                d="M23 16 A6 6 0 1 0 23 24" />
              {/* Horizontal grid lines */}
              <line x1="8" y1="18" x2="36" y2="18" stroke="white" strokeWidth="1" opacity="0.6" />
              <line x1="8" y1="22" x2="36" y2="22" stroke="white" strokeWidth="1" opacity="0.6" />
              {/* Vertical grid line */}
              <line x1="20" y1="5"  x2="20" y2="35" stroke="white" strokeWidth="1" opacity="0.6" />
            </svg>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '20px', color: 'var(--cadence-navy)', letterSpacing: '-0.01em' }}>
              Cadence
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`mk-nav-link ${pathname === href || pathname.startsWith(href + '/') ? 'mk-nav-link-active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              style={{
                border: '1px solid var(--cadence-navy)',
                color: 'var(--cadence-navy)',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                textDecoration: 'none',
                transition: 'background 150ms, color 150ms',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--cadence-navy)'; (e.target as HTMLElement).style.color = 'white' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = 'var(--cadence-navy)' }}
            >
              Sign In
            </Link>
            <Link
              href="/contact"
              style={{
                background: 'linear-gradient(135deg, #1B3A5C, #2A9D8F)',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              className="group"
            >
              Request Demo
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg transition-colors hover:bg-gray-100"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            style={{ color: 'var(--cadence-navy)' }}
          >
            <Menu size={22} />
          </button>
        </nav>
      </header>

      {/* ── Mobile full-screen overlay ────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col p-8"
          style={{ background: '#0F1C2E' }}
        >
          {/* Close button */}
          <div className="flex items-center justify-between mb-12">
            <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad-m" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#3BBFB0" />
                    <stop offset="100%" stopColor="#2A9D8F" />
                  </linearGradient>
                </defs>
                <path stroke="url(#logo-grad-m)" strokeWidth="3.5" fill="none" strokeLinecap="round"
                  d="M33 12 A15 15 0 1 0 33 28" />
                <path stroke="url(#logo-grad-m)" strokeWidth="2.5" fill="none" strokeLinecap="round"
                  d="M28 13.5 A10 10 0 1 0 28 26.5" />
                <path stroke="#3BBFB0" strokeWidth="2" fill="none" strokeLinecap="round"
                  d="M23 16 A6 6 0 1 0 23 24" />
                <line x1="8" y1="18" x2="36" y2="18" stroke="white" strokeWidth="1" opacity="0.3" />
                <line x1="8" y1="22" x2="36" y2="22" stroke="white" strokeWidth="1" opacity="0.3" />
                <line x1="20" y1="5"  x2="20" y2="35" stroke="white" strokeWidth="1" opacity="0.3" />
              </svg>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '20px', color: 'white' }}>Cadence</span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Nav links */}
          <div className="flex flex-col gap-2 flex-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '28px',
                  fontWeight: 600,
                  color: pathname === href ? 'var(--cadence-teal-light)' : 'white',
                  textDecoration: 'none',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  transition: 'color 150ms',
                }}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: '28px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              Sign In
            </Link>
          </div>

          {/* Bottom CTA */}
          <Link
            href="/contact"
            className="mk-btn-primary"
            style={{ justifyContent: 'center', padding: '16px 28px', fontSize: '16px' }}
          >
            Request a Demo
            <ArrowRight size={18} />
          </Link>
        </div>
      )}

      {/* spacer so content starts below the fixed nav */}
      <div style={{ height: '64px' }} />
    </>
  )
}
