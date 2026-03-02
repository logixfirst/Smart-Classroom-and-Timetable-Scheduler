'use client'

import { useProgress } from '@/hooks/useProgress'

export interface RunningJob {
  job_id: string
  progress: number
  status: string
  message: string
  time_remaining_seconds?: number | null
  department?: string
  academic_year?: string
  semester?: number
}

const STAGE_LABELS: Record<string, string> = {
  loading:         'Reading data',
  clustering:      'Organising courses',
  cpsat_solving:   'Building schedule',
  ga_optimization: 'Refining timetable',
  rl_refinement:   'Final polish',
}

function formatETA(seconds: number | null): string {
  if (seconds === null || seconds < 5) return 'Almost done\u2026'
  if (seconds < 60) return `~${Math.round(seconds)}s left`
  return `~${Math.ceil(seconds / 60)}m left`
}

interface RunningJobRowProps {
  job: RunningJob
  onNavigate: () => void
  onJobFailed: (jobId: string) => void
}

export function RunningJobRow({ job, onNavigate, onJobFailed }: RunningJobRowProps) {
  const { progress, isConnected } = useProgress(
    job.job_id,
    undefined,
    () => { onJobFailed(job.job_id) },
  )

  const isFailed    = progress?.status === 'failed' || progress?.status === 'cancelled'
  const pct         = progress?.overall_progress ?? 0
  const stage       = isFailed
    ? (progress?.status === 'cancelled' ? 'Cancelled' : 'Generation failed')
    : (progress?.stage ? (STAGE_LABELS[progress.stage] ?? progress.stage) : 'Connecting\u2026')
  const eta         = progress?.eta_seconds ?? null
  const hasProgress = pct > 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: isFailed ? 'var(--color-danger-subtle, #fff5f5)' : 'var(--color-bg-page)',
      border: `1px solid ${isFailed ? 'var(--color-danger)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.department ?? 'All Departments'}
          </span>
          {job.academic_year && job.semester && (
            <span style={{
              fontSize: 11, color: 'var(--color-text-muted)',
              background: 'var(--color-bg-surface-2)',
              padding: '1px 7px', borderRadius: 4,
              flexShrink: 0, fontWeight: 500,
            }}>
              {job.academic_year} &middot; Sem {job.semester}
            </span>
          )}
          {isFailed && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-danger-text, #c53030)',
              background: 'var(--color-danger-subtle, #fff5f5)',
              border: '1px solid var(--color-danger)',
              padding: '1px 7px', borderRadius: 4, flexShrink: 0,
            }}>
              {progress?.status === 'cancelled' ? 'Cancelled' : 'Failed'}
            </span>
          )}
        </div>

        {/* Stage + ETA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 12, color: isFailed ? 'var(--color-danger-text, #c53030)' : 'var(--color-text-secondary)' }}>
            {stage}
          </span>
          {!isFailed && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: 8 }}>
              {hasProgress
                ? <>{Math.round(pct)}% &nbsp;<span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{formatETA(eta)}</span></>
                : <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>{isConnected ? formatETA(eta) : 'Connecting\u2026'}</span>
              }
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ position: 'relative', height: 4, background: 'var(--color-bg-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: isFailed ? '100%' : `${Math.max(pct, 8)}%`,
            background: isFailed ? 'var(--color-danger)' : 'var(--color-primary)',
            borderRadius: 2,
            transition: 'width 600ms ease',
            animation: isFailed ? 'none' : 'progress-fill-breathe 2s ease-in-out infinite',
          }} />
          {!isFailed && (
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${Math.max(pct, 8)}%`,
              overflow: 'hidden', borderRadius: 2,
            }}>
              <span style={{
                position: 'absolute', inset: 0, width: '50%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                animation: 'progress-shine 1.8s linear infinite',
              }} />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onNavigate}
        className={isFailed ? 'btn-secondary' : 'btn-primary'}
        style={{ fontSize: 12, height: 32, padding: '0 14px', flexShrink: 0 }}
      >
        {isFailed ? 'View Details' : 'View Progress'}
      </button>
    </div>
  )
}
