import { authenticatedFetch } from '@/lib/auth'
import type {
  SubstitutionApplyPayload,
  SubstitutionApplyResponse,
  SubstitutionRecommendationRequest,
  SubstitutionRecommendationResponse,
} from '@/types/timetable'

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

export async function requestSubstitutionRecommendations(
  payload: SubstitutionRecommendationRequest,
): Promise<SubstitutionRecommendationResponse> {
  const res = await authenticatedFetch(`${API_BASE}/timetable/substitutions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || body?.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function applySubstitution(
  requestId: string,
  payload: SubstitutionApplyPayload,
): Promise<SubstitutionApplyResponse> {
  const res = await authenticatedFetch(`${API_BASE}/timetable/substitutions/${requestId}/apply/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || body?.detail || `Apply failed (${res.status})`)
  }
  return res.json()
}
