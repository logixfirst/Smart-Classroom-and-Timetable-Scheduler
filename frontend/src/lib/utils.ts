import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Tailwind merge ───────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Display name helpers ─────────────────────────────────────────────────────

/** Resolve display name + initials from a user object. */
export function resolveDisplayName(user: {
  first_name?: string
  last_name?: string
  username: string
}): { full: string; initials: string; firstName: string } {
  const firstName = user.first_name?.trim() ?? ''
  const lastName  = user.last_name?.trim()  ?? ''
  const full      = [firstName, lastName].filter(Boolean).join(' ') || user.username
  const initials  = (firstName[0] ?? user.username[0]).toUpperCase()
  return { full, initials, firstName: firstName || user.username }
}

// ─── Date formatters ──────────────────────────────────────────────────────────

/** Format an ISO date string as DD/MM/YYYY (en-IN locale). */
export function formatDateIN(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    })
  } catch {
    return isoString
  }
}

/** Format an ISO date string as a relative label ("2 hours ago", "Feb 3"). */
export function formatDateRelative(isoString: string): string {
  try {
    const date  = new Date(isoString)
    const now   = Date.now()
    const diff  = now - date.getTime() // ms

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours   = Math.floor(minutes / 60)
    const days    = Math.floor(hours   / 24)

    if (seconds <  60)  return 'just now'
    if (minutes <  60)  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    if (hours   <  24)  return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    if (days    <=  6)  return `${days} day${days !== 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  } catch {
    return isoString
  }
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

/** Map a backend role string to a human-readable label. */
export function getRolePillLabel(role: string): string {
  const map: Record<string, string> = {
    admin:       'Admin',
    org_admin:   'Org Admin',
    super_admin: 'Super Admin',
    faculty:     'Faculty',
    student:     'Student',
    staff:       'Staff',
    ADMIN:       'Admin',
    FACULTY:     'Faculty',
    STUDENT:     'Student',
    STAFF:       'Staff',
  }
  return map[role] ?? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

/** Return the Tailwind CSS classes for a role badge. */
export function getRoleColor(role: string): string {
  const map: Record<string, string> = {
    admin:       'badge badge-info',
    org_admin:   'badge badge-info',
    super_admin: 'badge badge-purple',
    faculty:     'badge badge-success',
    student:     'badge badge-warning',
    staff:       'badge badge-secondary',
  }
  return map[role.toLowerCase()] ?? 'badge'
}

// ─── String helpers ───────────────────────────────────────────────────────────

/** Truncate a string to `maxLength` characters, appending "…" if truncated. */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

// ─── Function helpers ─────────────────────────────────────────────────────────

/** Simple debounce that returns a typed wrapper. */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
