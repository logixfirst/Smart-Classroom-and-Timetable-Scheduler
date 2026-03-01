'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Linkedin, Twitter, Github } from 'lucide-react'

const PRODUCT_LINKS = [
  { label: 'Features',            href: '/product'           },
  { label: 'Pricing',             href: '/pricing'           },
  { label: 'Security',            href: '/product#security'  },
  { label: 'API Docs',            href: '/product#api'       },
  { label: 'Changelog',           href: '/blog'              },
]

const COMPANY_LINKS = [
  { label: 'About',   href: '/company'           },
  { label: 'Blog',    href: '/blog'              },
  { label: 'Careers', href: '/company#careers'   },
  { label: 'Contact', href: '/contact'           },
  { label: 'Press',   href: '/company#press'     },
]

const SUPPORT_LINKS = [
  { label: 'Documentation', href: '/product#docs'       },
  { label: 'Help Center',   href: '/contact'             },
  { label: 'Status Page',   href: '#'                    },
  { label: 'Privacy Policy',href: '/legal/privacy'       },
  { label: 'Terms of Service', href: '/legal/terms'      },
]

export function MarketingFooter() {
  return (
    <footer style={{ background: '#f8f9fa', borderTop: '1px solid #dadce0' }}>
      {/* Main grid */}
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Column 1 — Brand */}
          <div className="lg:col-span-1">
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <Image
                src="/logo2.png"
                alt="Cadence logo"
                width={36}
                height={36}
                style={{ objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }}
              />
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '17px', color: '#202124' }}>Cadence</span>
            </Link>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '1.7', color: '#5f6368', marginBottom: '20px', maxWidth: '210px' }}>
              AI-powered academic scheduling for institutions that refuse to waste time on spreadsheets.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                style={{ color: '#5f6368', transition: 'color 150ms', display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A73E8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5f6368')}
              >
                <Linkedin size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X"
                style={{ color: '#5f6368', transition: 'color 150ms', display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A73E8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5f6368')}
              >
                <Twitter size={18} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub"
                style={{ color: '#5f6368', transition: 'color 150ms', display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A73E8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5f6368')}
              >
                <Github size={18} />
              </a>
            </div>
          </div>

          {/* Column 2 — Product */}
          <div>
            <h4 style={{ fontFamily: 'Google Sans, Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: '#202124', marginBottom: '16px' }}>
              Product
            </h4>
            <ul className="flex flex-col gap-3">
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5f6368', textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1a73e8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#5f6368')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Company */}
          <div>
            <h4 style={{ fontFamily: 'Google Sans, Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: '#202124', marginBottom: '16px' }}>
              Company
            </h4>
            <ul className="flex flex-col gap-3">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5f6368', textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1a73e8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#5f6368')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Support */}
          <div>
            <h4 style={{ fontFamily: 'Google Sans, Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: '#202124', marginBottom: '16px' }}>
              Support
            </h4>
            <ul className="flex flex-col gap-3">
              {SUPPORT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5f6368', textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1a73e8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#5f6368')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid #dadce0' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#5f6368' }}>
            © 2026 Cadence. All rights reserved.
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#5f6368' }}>
            Made in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  )
}
