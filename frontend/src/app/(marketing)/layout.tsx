import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { AuthRedirect } from '@/components/AuthRedirect'

export const metadata: Metadata = {
  metadataBase: new URL('https://cadence.edu'),
  title: {
    default: 'Cadence — AI-Powered Academic Timetable Scheduling',
    template: '%s | Cadence',
  },
  description:
    'Generate conflict-free timetables for your institution in minutes. AI scheduling software for universities, colleges, and schools across India.',
  openGraph: {
    type: 'website',
    title: 'Cadence — Academic Scheduling, Reimagined',
    description:
      'Generate conflict-free timetables for your institution in minutes.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  keywords: [
    'timetable software',
    'academic scheduling',
    'AI timetable',
    'university scheduling',
    'NEP 2020',
    'India',
    'conflict-free',
  ],
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AuthRedirect />
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </>
  )
}
