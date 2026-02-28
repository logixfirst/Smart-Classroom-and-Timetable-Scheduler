/**
 * Timetable Variant API — Google-style comparison & scoring client.
 *
 * Endpoints consumed:
 *   GET /api/timetable/variants/?job_id=X                  → VariantSummary[]
 *   GET /api/timetable/variants/{id}/entries/?job_id=X     → TimetableSlotDetailed[]
 *   GET /api/timetable/variants/compare/?job_id=X&a=&b=    → ComparisonResult
 *   POST /api/timetable/variants/{id}/select/              → { success, variant_id }
 *   POST /api/generation-jobs/{id}/approve/                → { success }
 */

import type {
  VariantSummary,
  TimetableSlotDetailed,
  ComparisonResult,
  DepartmentOption,
} from '@/types/timetable'

const API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Shared fetch helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error || body?.detail || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Variant list with score cards
// ---------------------------------------------------------------------------

/**
 * Fetch all variants for a generation job.
 * Returns lightweight summaries — no timetable_entries (fetched on demand).
 */
export async function fetchVariants(jobId: string): Promise<VariantSummary[]> {
  return apiFetch<VariantSummary[]>(`/timetable/variants/?job_id=${jobId}`)
}

// ---------------------------------------------------------------------------
// Variant entries (on-demand load)
// ---------------------------------------------------------------------------

/**
 * Load the full timetable entries for a single variant.
 *
 * @param variantId  "{job_id}-variant-{n}"
 * @param jobId      parent generation job UUID
 * @param deptId     optional department filter; "all" = no filter
 * @param year       optional year filter 1-4; 0 = all years
 */
export async function fetchVariantSlots(
  variantId: string,
  jobId: string,
  deptId = 'all',
  year = 0,
): Promise<TimetableSlotDetailed[]> {
  if (deptId !== 'all') {
    // Use the department_view action for pre-filtered server response
    const params = new URLSearchParams({
      job_id: jobId,
      department_id: deptId,
    })
    const data = await apiFetch<{ timetable_entries: TimetableSlotDetailed[] }>(
      `/timetable/variants/${encodeURIComponent(variantId)}/department_view/?${params}`,
    )
    const entries = data.timetable_entries || []
    return year ? entries.filter((e) => e.year === year) : entries
  }

  const data = await apiFetch<{ timetable_entries: TimetableSlotDetailed[] }>(
    `/timetable/variants/${encodeURIComponent(variantId)}/entries/?job_id=${jobId}`,
  )
  const entries = data.timetable_entries || []
  return year ? entries.filter((e) => e.year === year) : entries
}

// ---------------------------------------------------------------------------
// Side-by-side comparison / diff
// ---------------------------------------------------------------------------

/**
 * Diff two variants server-side; returns coloured bucket arrays.
 *
 * @param jobId    parent generation job UUID
 * @param idA      variant id A
 * @param idB      variant id B
 * @param deptId   optional dept filter
 */
export async function compareVariants(
  jobId: string,
  idA: string,
  idB: string,
  deptId = 'all',
): Promise<ComparisonResult> {
  const params = new URLSearchParams({
    job_id: jobId,
    a: idA,
    b: idB,
    department_id: deptId,
  })
  return apiFetch<ComparisonResult>(`/timetable/variants/compare/?${params}`)
}

// ---------------------------------------------------------------------------
// Pick / approval flow
// ---------------------------------------------------------------------------

/**
 * Mark a variant as the chosen one (Step 1 of approval flow).
 * Sends it for HOD review.
 */
export async function pickVariant(variantId: string, jobId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(
    `/generation-jobs/${jobId}/select-variant/`,
    {
      method: 'POST',
      body: JSON.stringify({ variant_id: variantId }),
    },
  )
}

/**
 * HOD approves the timetable (Step 2 — optional comment).
 */
export async function approveVariant(
  jobId: string,
  comment = '',
): Promise<void> {
  await apiFetch<{ success: boolean }>(
    `/generation-jobs/${jobId}/approve/`,
    {
      method: 'POST',
      body: JSON.stringify({ comments: comment, review_type: 'approve' }),
    },
  )
}

/**
 * HOD rejects / requests changes (Step 2 reverse path).
 */
export async function rejectVariant(
  jobId: string,
  reason: string,
): Promise<void> {
  await apiFetch<{ success: boolean }>(
    `/generation-jobs/${jobId}/approve/`,
    {
      method: 'POST',
      body: JSON.stringify({ comments: reason, review_type: 'request_changes' }),
    },
  )
}

// ---------------------------------------------------------------------------
// Department list
// ---------------------------------------------------------------------------

/**
 * Fetch departments that have entries in a given variant.
 * Uses department_stats from the department_view action.
 */
export async function fetchVariantDepartments(
  variantId: string,
  jobId: string,
): Promise<DepartmentOption[]> {
  const data = await apiFetch<{ department_stats: Record<string, number> }>(
    `/timetable/variants/${encodeURIComponent(variantId)}/department_view/?job_id=${jobId}&department_id=all`,
  )
  const stats = data.department_stats || {}
  return Object.entries(stats).map(([id, count]) => ({
    id,
    name: id,
    code: id,
    total_entries: count as number,
  }))
}
