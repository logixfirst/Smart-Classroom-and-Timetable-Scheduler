/**
 * API Service for Timetable Management
 * Handles all backend API calls for timetable generation, workflow, and approval
 */

import {
  GenerationJob,
  TimetableWorkflow,
  TimetableVariant,
  TimetableListItem,
  GenerateTimetableRequest,
  GenerateTimetableResponse,
  ApprovalRequest,
  ApprovalResponse,
  FacultyAvailability,
} from '@/types/timetable'

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'
const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001'
const FASTAPI_WS_BASE = process.env.NEXT_PUBLIC_FASTAPI_WS_URL || 'ws://localhost:8001'

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(
      error.error || error.detail || `HTTP ${response.status}: ${response.statusText}`
    )
  }
  return response.json()
}

function getAuthHeaders(): HeadersInit {
  // Using HttpOnly cookies for authentication (like rest of the app)
  // No need for Authorization header - cookies sent automatically
  return {
    'Content-Type': 'application/json',
  }
}

function getFetchOptions(): RequestInit {
  return {
    headers: getAuthHeaders(),
    credentials: 'include', // Send HttpOnly cookies with request
  }
}

// ============================================
// TIMETABLE WORKFLOW API
// ============================================

export async function fetchTimetableWorkflows(filters?: {
  organization_id?: string
  status?: string
  semester?: number
  academic_year?: string
}): Promise<TimetableWorkflow[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.semester) params.append('semester', filters.semester.toString())
    if (filters?.academic_year) params.append('academic_year', filters.academic_year)

    const response = await fetch(
      `${DJANGO_API_BASE}/generation-jobs/?${params.toString()}`,
      getFetchOptions()
    )
    
    // If server error, return empty array instead of throwing
    if (!response.ok) {
      console.warn(`API returned ${response.status}, returning empty array`)
      return []
    }
    
    const data = await response.json()
    // Handle both paginated {results: [], count: X} and direct array responses
    return Array.isArray(data) ? data : data.results || []
  } catch (error) {
    console.error('Failed to fetch timetable workflows:', error)
    return [] // Return empty array on any error
  }
}

export async function fetchTimetableWorkflowById(id: string): Promise<TimetableWorkflow> {
  const response = await fetch(`${DJANGO_API_BASE}/timetable-workflow/${id}/`, getFetchOptions())
  return handleResponse<TimetableWorkflow>(response)
}

// ============================================
// TIMETABLE VARIANTS API
// ============================================

export async function fetchTimetableVariants(filters?: {
  job_id?: string
  organization_id?: string
}): Promise<TimetableVariant[]> {
  const params = new URLSearchParams()
  if (filters?.job_id) params.append('job_id', filters.job_id)
  if (filters?.organization_id) params.append('organization_id', filters.organization_id)

  const response = await fetch(
    `${DJANGO_API_BASE}/timetable-variants/?${params.toString()}`,
    getFetchOptions()
  )
  const data = await handleResponse<any>(response)
  // Handle both paginated {results: [], count: X} and direct array responses
  return Array.isArray(data) ? data : data.results || []
}

export async function selectVariant(
  variantId: string
): Promise<{ message: string; timetable_id: string }> {
  const response = await fetch(`${DJANGO_API_BASE}/timetable-variants/select_variant/`, {
    method: 'POST',
    ...getFetchOptions(),
    body: JSON.stringify({ variant_id: variantId }),
  })
  return handleResponse(response)
}

// ============================================
// GENERATION JOB API
// ============================================

export async function generateTimetable(
  request: GenerateTimetableRequest
): Promise<GenerateTimetableResponse> {
  const response = await fetch(`${DJANGO_API_BASE}/generation-jobs/generate/`, {
    method: 'POST',
    ...getFetchOptions(),
    body: JSON.stringify(request),
  })
  return handleResponse<GenerateTimetableResponse>(response)
}

export async function fetchGenerationJobStatus(jobId: string): Promise<GenerationJob> {
  const response = await fetch(`${DJANGO_API_BASE}/generation-jobs/${jobId}/`, getFetchOptions())
  return handleResponse<GenerationJob>(response)
}

export async function listGenerationJobs(filters?: {
  status?: string
  limit?: number
}): Promise<GenerationJob[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const response = await fetch(
    `${DJANGO_API_BASE}/generation-jobs/?${params.toString()}`,
    getFetchOptions()
  )
  const data = await handleResponse<any>(response)
  // Handle both paginated {results: [], count: X} and direct array responses
  return Array.isArray(data) ? data : data.results || []
}

// ============================================
// APPROVAL WORKFLOW API
// ============================================

export async function submitReview(
  workflowId: string,
  request: ApprovalRequest
): Promise<ApprovalResponse> {
  const response = await fetch(
    `${DJANGO_API_BASE}/timetable-workflow/${workflowId}/submit_review/`,
    {
      method: 'POST',
      ...getFetchOptions(),
      body: JSON.stringify(request),
    }
  )
  return handleResponse<ApprovalResponse>(response)
}

export async function approveTimetable(
  workflowId: string,
  comments?: string
): Promise<ApprovalResponse> {
  return submitReview(workflowId, {
    variant_id: '', // Will be extracted from workflow
    review_type: 'approve',
    comments,
  })
}

export async function rejectTimetable(
  workflowId: string,
  reason: string
): Promise<ApprovalResponse> {
  return submitReview(workflowId, {
    variant_id: '',
    review_type: 'reject',
    comments: reason,
  })
}

// ============================================
// FACULTY AVAILABILITY API
// ============================================

export async function fetchFacultyAvailability(filters?: {
  department_id?: string
  organization_id?: string
}): Promise<FacultyAvailability[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.department_id) params.append('department', filters.department_id)
    if (filters?.organization_id) params.append('organization', filters.organization_id)

    const response = await fetch(
      `${DJANGO_API_BASE}/faculty/?${params.toString()}`,
      getFetchOptions()
    )

    // If 401 Unauthorized, return empty array (session expired)
    if (response.status === 401) {
      console.warn('Authentication required - session may have expired')
      return []
    }

    const data = await handleResponse<any>(response)
    // Handle both paginated {results: [], count: X} and direct array responses
    const faculty = Array.isArray(data) ? data : data.results || []

    // Transform to FacultyAvailability format
    return faculty.map((f: any) => {
      // Construct full name from first_name, middle_name, last_name
      const nameParts = [f.first_name, f.middle_name, f.last_name].filter(Boolean)
      const fullName = nameParts.join(' ') || f.faculty_name || 'Unknown'
      
      return {
        id: f.faculty_id || f.id,
        name: fullName,
        available: f.is_active !== false, // Assume active faculty are available
        email: f.email,
        department: f.department?.dept_name,
      }
    })
  } catch (error) {
    console.error('Failed to fetch faculty:', error)
    return []
  }
}

export async function updateFacultyAvailability(
  facultyId: string,
  available: boolean
): Promise<{ success: boolean }> {
  const response = await fetch(`${DJANGO_API_BASE}/faculty/${facultyId}/`, {
    method: 'PATCH',
    ...getFetchOptions(),
    body: JSON.stringify({ is_active: available }),
  })
  return handleResponse(response)
}

// ============================================
// TIMETABLE CONFIGURATION API
// ============================================

export async function fetchLastTimetableConfig(): Promise<any> {
  const response = await fetch(
    `${DJANGO_API_BASE}/academics/timetable-configs/last_used/`,
    getFetchOptions()
  )
  if (!response.ok) {
    return null
  }
  return handleResponse(response)
}

export async function saveTimetableConfig(config: any): Promise<any> {
  const response = await fetch(`${DJANGO_API_BASE}/academics/timetable-configs/`, {
    method: 'POST',
    ...getFetchOptions(),
    body: JSON.stringify(config),
  })
  return handleResponse(response)
}

// ============================================
// UTILITY: Transform Workflows to List Items
// ============================================

export function transformWorkflowsToListItems(workflows: TimetableWorkflow[]): TimetableListItem[] {
  // Handle null/undefined workflows
  if (!workflows || !Array.isArray(workflows)) {
    return []
  }

  return workflows.map(workflow => {
    // Extract year from semester (assuming semesters 1-2 = year 1, 3-4 = year 2, etc.)
    const year = Math.ceil(workflow.semester / 2)

    // Get batch name from variant or use department as fallback
    const batchNames = workflow.variant?.batch_ids?.join(', ') || 'All Batches'

    return {
      id: workflow.id,
      year,
      batch: batchNames,
      department: workflow.department_id,
      semester: workflow.semester,
      status: workflow.status === 'pending_review' ? 'pending' : workflow.status,
      lastUpdated: new Date(workflow.updated_at).toLocaleDateString(),
      conflicts: workflow.variant?.conflict_count || 0,
      score: workflow.variant?.score,
      academic_year: workflow.academic_year,
      variant_id: workflow.variant?.id,
      job_id: workflow.job_id,
    }
  })
}
