import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from 'next-themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SIH28 - Timetable Optimization Platform',
  description: 'AI-powered timetable optimization for educational institutions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
          <AuthProvider>
            {children}
          </AuthProvider>
      </body>
    </html>
  )
}