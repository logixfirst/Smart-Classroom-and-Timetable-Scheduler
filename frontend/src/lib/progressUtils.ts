/**
 * Pure utility functions for progress display.
 * These are plain functions — not hooks — and belong in lib/, not hooks/.
 */

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

// ─── Crawl speed curve (mirrors NavigationProgress) ──────────────────────────

/**
 * Deceleration curve for fake-progress crawl animations.
 * Returns the next increment to add to the current progress width.
 * Used by useCardProgress and NavigationProgress-style bars.
 */
export function crawlStep(w: number): number {
  if (w <  30) return 8   + Math.random() * 4
  if (w <  50) return 5   + Math.random() * 3
  if (w <  65) return 3   + Math.random() * 2
  if (w <  75) return 1.5 + Math.random() * 1.5
  if (w <  82) return 0.8 + Math.random() * 0.8
  if (w <  87) return 0.4 + Math.random() * 0.4
  return 0.15 + Math.random() * 0.15
}

// ─── Progress snapshot ────────────────────────────────────────────────────────

export interface ProgressSnapshot {
  job_id: string
  stage: string
  stage_progress: number
  overall_progress: number
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  eta_seconds: number | null
  started_at: number
  last_updated: number
  metadata: Record<string, unknown>
}

/**
 * Fetch progress snapshot (one-time, no SSE subscription).
 * Useful for checking progress without establishing a persistent connection.
 */
export async function fetchProgressSnapshot(jobId: string): Promise<ProgressSnapshot | null> {
  try {
    const response = await fetch(`${DJANGO_API_BASE}/generation/progress/${jobId}/`, {
      credentials: 'include',
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('[Progress] Failed to fetch snapshot:', error)
    return null
  }
}

// ─── ETA formatter ────────────────────────────────────────────────────────────

/**
 * Format ETA seconds into a human-readable string like "2m 30s".
 */
export function formatETA(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return 'Calculating...'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

// ─── Stage display name ───────────────────────────────────────────────────────

/**
 * Map internal stage identifiers to professional user-facing labels.
 *
 * PRINCIPLE:
 * - Internal stage name ≠ User-facing stage name
 * - No algorithm exposure (CP-SAT, GA, RL)
 * - Clear action verbs, emotionally neutral
 * (Google Cloud / AWS / Azure UX patterns)
 */
export function getStageDisplayName(stage: string): string {
  const stageNames: Record<string, string> = {
    initializing:    'Preparing Schedule',
    loading:         'Loading Academic Data',
    clustering:      'Organizing Courses',
    cpsat_solving:   'Building Schedule',
    ga_optimization: 'Optimizing Schedule',
    rl_refinement:   'Finalizing Schedule',
    completed:       'Schedule Ready',
    failed:          'Generation Failed',
    cancelled:       'Cancelled by User',
  }
  return stageNames[stage] ?? stage
}
