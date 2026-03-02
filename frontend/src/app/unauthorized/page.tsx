'use client'

/**
 * Unauthorized (403) Page — Google Material Design 3 style
 * Fully integrated with project's global.css design system
 * 
 * WHEN GOOGLE SHOWS THIS PAGE (Senior Developer Analysis):
 * =========================================================
 * 
 * 1. ROLE-BASED ACCESS CONTROL (RBAC)
 *    - User authenticated but lacks required role/permission
 *    - Example: Student trying to access /admin routes
 *    - Example: Faculty trying to access admin-only features
 * 
 * 2. RESOURCE-LEVEL PERMISSIONS
 *    - User tries to view/edit resources they don't own
 *    - Example: Editing another user's profile
 *    - Example: Accessing private documents
 * 
 * 3. ORGANIZATION/WORKSPACE ACCESS
 *    - User not part of required organization
 *    - Example: Google Workspace - accessing another company's resources
 *    - Example: Trying to join a meeting without invitation
 * 
 * 4. FEATURE FLAGS / BETA ACCESS
 *    - User tries to access features not enabled for their account
 *    - Example: Premium features without subscription
 *    - Example: Beta features not enabled for user
 * 
 * 5. API RATE LIMITING / QUOTA EXCEEDED
 *    - User exceeded their usage quota
 *    - Example: Too many API requests
 *    - Example: Storage quota exceeded
 * 
 * 6. GEOGRAPHIC RESTRICTIONS
 *    - Content not available in user's region
 *    - Example: YouTube videos blocked by country
 *    - Example: Services not launched in specific regions
 * 
 * GOOGLE'S UX PRINCIPLES FOR ERROR PAGES:
 * ========================================
 * - Clear, human-friendly messaging (no technical jargon)
 * - Actionable next steps (what user can do)
 * - Consistent branding and visual hierarchy
 * - Helpful context without exposing security details
 * - Multiple recovery paths when possible
 * - Accessibility-first design (WCAG AAA)
 */

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, Home, LogOut, HelpCircle, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleGoBack = () => {
    router.back()
  }

  // Determine user's home route based on role
  const homeRoute = user?.role 
    ? `/${user.role}/dashboard` 
    : '/login'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-page)' }}>
      <div className="w-full max-w-[480px]">
        
        {/* Error Icon — Google Material 3 style */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-warning-subtle) 0%, var(--color-danger-subtle) 100%)',
            }}
          >
            <ShieldAlert 
              size={44} 
              strokeWidth={1.5}
              style={{ color: 'var(--color-danger)' }}
            />
          </div>
        </div>

        {/* Heading */}
        <h1 
          className="text-center leading-[36px] mb-3"
          style={{ 
            fontSize: 'var(--text-2xl)',
            fontWeight: 400,
            color: 'var(--color-text-primary)'
          }}
        >
          You don't have access
        </h1>

        {/* Description */}
        <p 
          className="text-center leading-[20px] mb-8 px-4"
          style={{ 
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}
        >
          You need permission to access this page. Try checking with the page owner, 
          or contact your administrator if you think this is a mistake.
        </p>

        {/* Action Buttons — Using project's button classes */}
        <div className="flex flex-col gap-3 px-4">
          
          {/* Primary Action: Go Home */}
          <Link
            href={homeRoute}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Go to home
          </Link>

          {/* Secondary Actions Row */}
          <div className="flex gap-2">
            
            {/* Go Back */}
            <button
              onClick={handleGoBack}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Go back
            </button>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>

        {/* Help Link — Google-style subtle footer */}
        <div className="mt-8 text-center">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-primary)]"
            style={{ 
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <HelpCircle size={14} />
            Learn more about access permissions
          </Link>
        </div>

        {/* Error Code — Google-style subtle metadata */}
        <div className="mt-6 text-center">
          <p 
            className="font-mono tracking-wide"
            style={{ 
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)'
            }}
          >
            Error 403 • Forbidden
          </p>
        </div>

      </div>
    </div>
  )
}
