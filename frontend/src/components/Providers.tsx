'use client'

import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/context/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
