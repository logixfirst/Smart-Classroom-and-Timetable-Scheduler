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
  ComparisonResult,
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

// ---------------------------------------------------------------------------
// Department name lookup (for DepartmentTree display names)
// ---------------------------------------------------------------------------

/**
 * Fetch all active departments and return a UUID → { name, code } map.
 * Used by the review page to show real department names in DepartmentTree
 * instead of raw UUIDs.
 */
export async function fetchDepartmentNames(): Promise<Map<string, { name: string; code: string }>> {
  const map = new Map<string, { name: string; code: string }>()
  let nextPath = '/departments/?page_size=500'
  let pageCount = 0

  while (nextPath && pageCount < 20) {
    const data = await apiFetch<unknown>(nextPath)
    const payload = data as any
    const items: any[] = Array.isArray(payload) ? payload : (payload?.results ?? [])

    items.forEach((d: any) => {
      const id: string | undefined = d.dept_id ?? d.id
      if (id) {
        map.set(id, {
          name: d.dept_name ?? d.name ?? id,
          code: d.dept_short_name ?? d.dept_code ?? id,
        })
      }
    })

    const nextUrl: string | null = Array.isArray(payload) ? null : (payload?.next ?? null)
    if (!nextUrl) {
      nextPath = ''
    } else {
      try {
        const parsed = new URL(nextUrl)
        nextPath = `${parsed.pathname}${parsed.search}`.replace(/^\/api/, '')
      } catch {
        nextPath = nextUrl.startsWith('http') ? '' : nextUrl
      }
    }

    pageCount += 1
  }

  return map
}
