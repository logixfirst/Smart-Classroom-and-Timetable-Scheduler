'use client'

/**
 * VariantStatusBadge — pill chip for Draft / Pending / Approved / Published.
 *
 * Uses CSS variables from the existing design system so it respects dark-mode
 * automatically.
 */

type VariantStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected'

interface VariantStatusBadgeProps {
  status: VariantStatus | string
}

const CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft: {
    bg: 'var(--color-bg-surface-2)',
    text: 'var(--color-text-secondary)',
    dot: 'var(--color-text-muted)',
    label: 'Draft',
  },
  pending_review: {
    bg: 'var(--color-warning-subtle)',
    text: 'var(--color-warning-text)',
    dot: 'var(--color-warning)',
    label: 'Pending Review',
  },
  approved: {
    bg: 'var(--color-success-subtle)',
    text: 'var(--color-success-text)',
    dot: 'var(--color-success)',
    label: 'Approved',
  },
  published: {
    bg: '#e6f4ea',
    text: '#137333',
    dot: '#34a853',
    label: 'Published',
  },
  rejected: {
    bg: 'var(--color-danger-subtle)',
    text: 'var(--color-danger-text)',
    dot: 'var(--color-danger)',
    label: 'Rejected',
  },
  completed: {
    bg: 'var(--color-info-subtle, #e8f0fe)',
    text: 'var(--color-info, #1967d2)',
    dot: 'var(--color-primary)',
    label: 'Generated',
  },
}

export function VariantStatusBadge({ status }: VariantStatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG['draft']
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 12,
        background: cfg.bg,
        color: cfg.text,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  )
}
