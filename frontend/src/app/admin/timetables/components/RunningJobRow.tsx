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
    <div className={`flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] border ${
      isFailed
        ? 'bg-[var(--color-danger-subtle)] border-[var(--color-danger)]'
        : 'bg-[var(--color-bg-page)] border-[var(--color-border)]'
    }`}>
      <div className="flex-1 min-w-0">
        {/* Identity row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
            {job.department ?? 'All Departments'}
          </span>
          {job.academic_year && job.semester && (
            <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-bg-surface-2)] px-1.5 py-px rounded shrink-0 font-medium">
              {job.academic_year} &middot; Sem {job.semester}
            </span>
          )}
          {isFailed && (
            <span className="badge badge-danger shrink-0">
              {progress?.status === 'cancelled' ? 'Cancelled' : 'Failed'}
            </span>
          )}
        </div>

        {/* Stage + ETA row */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs ${isFailed ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-text-secondary)]'}`}>
            {stage}
          </span>
          {!isFailed && (
            <span className="text-xs font-semibold text-[var(--color-text-primary)] shrink-0 ml-2">
              {hasProgress
                ? <>{Math.round(pct)}%&nbsp;<span className="font-normal text-[var(--color-text-muted)]">{formatETA(eta)}</span></>
                : <span className="font-normal text-[var(--color-text-muted)]">{isConnected ? formatETA(eta) : 'Connecting…'}</span>
              }
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-1 bg-[var(--color-bg-surface-3)] rounded overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded transition-[width] duration-[600ms] ease-out ${
              isFailed ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-primary)]'
            }`}
            style={{ width: isFailed ? '100%' : `${Math.max(pct, 8)}%` }}
          />
          {!isFailed && (
            <div
              className="absolute top-0 left-0 h-full overflow-hidden rounded"
              style={{ width: `${Math.max(pct, 8)}%` }}
            >
              <span className="status-shimmer-overlay absolute inset-0" />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onNavigate}
        className={`${isFailed ? 'btn-secondary' : 'btn-primary'} shrink-0 text-xs h-8 px-3.5`}
      >
        {isFailed ? 'View Details' : 'View Progress'}
      </button>
    </div>
  )
}
