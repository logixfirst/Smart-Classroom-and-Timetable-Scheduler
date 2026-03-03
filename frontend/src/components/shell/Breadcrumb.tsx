'use client'

/**
 * Breadcrumb – Google Drive-style path bar.
 *
 * Renders automatically from the current pathname.
 * Each ancestor segment is a clickable link; the last segment is the current
 * page (bold, non-linked). Chevron (›) separators with a muted colour.
 *
 * Shows nothing on root-level pages (dashboard, single-level routes) that
 * don't benefit from a breadcrumb chain.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string   // undefined → current page (non-clickable)
}

// ─── Route config ──────────────────────────────────────────────────────────────
// Patterns are matched top-to-bottom; first match wins.
// Dynamic segments (UUIDs / IDs) are captured but not used for display.

const ROUTES: Array<{ pattern: RegExp; crumbs: () => BreadcrumbItem[] }> = [
  // ── Admin: Timetables deep pages ────────────────────────────────────────
  {
    pattern: /^\/admin\/timetables\/[^/]+\/compare/,
    crumbs: () => [
      { label: 'Timetables', href: '/admin/timetables' },
      { label: 'Compare Variants' },
    ],
  },
  {
    pattern: /^\/admin\/timetables\/[^/]+\/status/,
    crumbs: () => [
      { label: 'Timetables', href: '/admin/timetables' },
      { label: 'Generation Status' },
    ],
  },
  {
    pattern: /^\/admin\/timetables\/new/,
    crumbs: () => [
      { label: 'Timetables', href: '/admin/timetables' },
      { label: 'New Timetable' },
    ],
  },
  {
    pattern: /^\/admin\/timetables\/[^/]+\/review/,
    crumbs: () => [
      { label: 'Timetables', href: '/admin/timetables' },
      { label: 'Review Variants' },
    ],
  },

  // ── Admin: Academic sub-pages ───────────────────────────────────────────
  {
    pattern: /^\/admin\/academic\/schools/,
    crumbs: () => [
      { label: 'Academic', href: '/admin/academic' },
      { label: 'Schools' },
    ],
  },
  {
    pattern: /^\/admin\/academic\/departments/,
    crumbs: () => [
      { label: 'Academic', href: '/admin/academic' },
      { label: 'Departments' },
    ],
  },
  {
    pattern: /^\/admin\/academic\/courses/,
    crumbs: () => [
      { label: 'Academic', href: '/admin/academic' },
      { label: 'Courses' },
    ],
  },
  {
    pattern: /^\/admin\/academic\/rooms/,
    crumbs: () => [
      { label: 'Academic', href: '/admin/academic' },
      { label: 'Rooms' },
    ],
  },
  {
    pattern: /^\/admin\/academic\/buildings/,
    crumbs: () => [
      { label: 'Academic', href: '/admin/academic' },
      { label: 'Buildings' },
    ],
  },
  {
    pattern: /^\/admin\/academic\/programs/,
    crumbs: () => [
      { label: 'Academic', href: '/admin/academic' },
      { label: 'Programs' },
    ],
  },

  // ── Admin: top-level single pages ───────────────────────────────────────
  { pattern: /^\/admin\/timetables$/, crumbs: () => [{ label: 'Timetables' }] },
  { pattern: /^\/admin\/dashboard/,   crumbs: () => [{ label: 'Dashboard' }] },
  { pattern: /^\/admin\/faculty/,     crumbs: () => [{ label: 'Faculty' }] },
  { pattern: /^\/admin\/students/,    crumbs: () => [{ label: 'Students' }] },
  { pattern: /^\/admin\/approvals/,   crumbs: () => [{ label: 'Approvals' }] },
  { pattern: /^\/admin\/admins/,      crumbs: () => [{ label: 'Admins' }] },
  { pattern: /^\/admin\/logs/,        crumbs: () => [{ label: 'Logs' }] },

  // ── Faculty pages ────────────────────────────────────────────────────────
  { pattern: /^\/faculty\/dashboard/, crumbs: () => [{ label: 'Dashboard' }] },
  { pattern: /^\/faculty\/schedule/,  crumbs: () => [{ label: 'My Schedule' }] },
  {
    pattern: /^\/faculty\/preferences/,
    crumbs: () => [
      { label: 'My Schedule', href: '/faculty/schedule' },
      { label: 'Preferences' },
    ],
  },

  // ── Student pages ────────────────────────────────────────────────────────
  { pattern: /^\/student\/dashboard/, crumbs: () => [{ label: 'Dashboard' }] },
  { pattern: /^\/student\/timetable/, crumbs: () => [{ label: 'My Timetable' }] },
]

// ─── Pages that render their own PageHeader (title + count) ──────────────────
// Breadcrumb is suppressed on these routes to avoid a duplicate h1.
const SUPPRESS_ROUTES: RegExp[] = [
  // Academic sub-pages — all have DataTable + PageHeader
  /^\/admin\/academic\/schools/,
  /^\/admin\/academic\/departments/,
  /^\/admin\/academic\/programs/,
  /^\/admin\/academic\/buildings/,
  /^\/admin\/academic\/rooms/,
  /^\/admin\/academic\/courses/,
  /^\/admin\/admins/,
  /^\/admin\/faculty/,
  /^\/admin\/students/,
  /^\/admin\/approvals/,
  /^\/admin\/logs/,
  // Timetable pages — all render their own PageHeader or are full-screen overlays
  /^\/admin\/timetables/,
]

// ─── Component ────────────────────────────────────────────────────────────────

export function Breadcrumb() {
  const pathname = usePathname()

  // Suppress on pages that have their own PageHeader
  if (SUPPRESS_ROUTES.some((r) => r.test(pathname))) return null

  const match = ROUTES.find((r) => r.pattern.test(pathname))
  if (!match) return null

  const crumbs = match.crumbs()

  // Single-item: no parent path — render as a standalone page title.
  if (crumbs.length === 1) {
    return (
      <h1 className="text-2xl font-normal tracking-tight [color:var(--color-text-primary)] mb-4 md:mb-5 select-none">
        {crumbs[0].label}
      </h1>
    )
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-baseline gap-2 mb-4 md:mb-5 select-none flex-wrap"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.label} className="flex items-baseline gap-2 min-w-0">
            {/* Separator — not before first item */}
            {i > 0 && (
              <ChevronRight
                size={16}
                className="shrink-0 opacity-40 [color:var(--color-text-muted)] self-center"
                strokeWidth={2}
              />
            )}

            {isLast || !crumb.href ? (
              /* Current page — dark, normal weight (no bold), non-interactive */
              <span
                className="text-2xl font-normal tracking-tight [color:var(--color-text-primary)]"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              /* Ancestor — grey text, pill hover (rounded-full = stadium shape, Material 3 style), no underline, no color change */
              <Link
                href={crumb.href}
                className="text-2xl font-normal no-underline cursor-pointer rounded-full px-3 py-0.5 -mx-3 transition-colors [color:var(--color-text-secondary)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:[color:var(--color-text-secondary)]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
