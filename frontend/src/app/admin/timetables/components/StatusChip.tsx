const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  approved:      { bg: 'var(--color-success-subtle)', text: 'var(--color-success-text)', dot: 'var(--color-success)',      label: 'Approved'       },
  completed:     { bg: 'var(--color-success-subtle)', text: 'var(--color-success-text)', dot: 'var(--color-success)',      label: 'Completed'      },
  pending:       { bg: 'var(--color-warning-subtle)', text: 'var(--color-warning-text)', dot: 'var(--color-warning)',      label: 'Pending'        },
  pending_review:{ bg: 'var(--color-warning-subtle)', text: 'var(--color-warning-text)', dot: 'var(--color-warning)',      label: 'Pending Review' },
  running:       { bg: 'var(--color-info-subtle)',    text: 'var(--color-info)',          dot: 'var(--color-primary)',     label: 'Running'        },
  draft:         { bg: 'var(--color-bg-surface-2)',   text: 'var(--color-text-secondary)',dot: 'var(--color-text-muted)', label: 'Draft'          },
  rejected:      { bg: 'var(--color-danger-subtle)',  text: 'var(--color-danger-text)',   dot: 'var(--color-danger)',      label: 'Rejected'       },
  failed:        { bg: 'var(--color-danger-subtle)',  text: 'var(--color-danger-text)',   dot: 'var(--color-danger)',      label: 'Failed'         },
}

export function StatusChip({ status, isRunning }: { status: string; isRunning?: boolean }) {
  const key = isRunning ? 'running' : status
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG['draft']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 12, flexShrink: 0,
      background: cfg.bg, color: cfg.text, fontSize: 12, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}
