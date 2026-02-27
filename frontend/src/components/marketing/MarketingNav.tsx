'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }} aria-label="Cadence home">
            <Image
              src="/logo2.png"
              alt="Cadence logo"
              width={120}
              height={36}
              style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
              priority
            />
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
            <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Image
                src="/logo2.png"
                alt="Cadence logo"
                width={120}
                height={36}
                style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
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
