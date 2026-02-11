/**
 * TypeScript interfaces matching Django backend models
 * Based on backend/django/academics/models.py
 */

// ============================================
// GENERATION & WORKFLOW MODELS
// ============================================

export interface GenerationJob {
  id: string // UUID
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  completed_at: string | null
  error_message: string | null
  progress: number // 0-100
  timetable_data: any | null
}

export interface TimetableWorkflow {
  id: string // UUID
  job_id: string
  organization_id: string
  department_id: string
  semester: number
  academic_year: string
  status: 'pending_review' | 'approved' | 'rejected' | 'draft'
  created_by: {
    id: string
    username: string
    email: string
  }
  created_at: string
  updated_at: string
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  variant: TimetableVariant | null
  timetable_entries: TimetableEntry[]
  reviews: TimetableReview[]
}

export interface TimetableVariant {
  id: string
  job_id: string
  organization_id: string
  department_id: string
  batch_ids: string[]
  semester: number
  academic_year: string
  variant_number: number
  score: number
  conflict_count: number
  room_utilization: number
  faculty_workload_balance: number
  timetable_entries: TimetableEntry[]
  is_selected: boolean
  selected_at: string | null
  selected_by: string | null
  created_at: string
  metadata: {
    generation_time_seconds?: number
    algorithm_version?: string
    constraints_satisfied?: number
    total_constraints?: number
    [key: string]: any
  }
}

export interface TimetableEntry {
  day: string // 'Monday', 'Tuesday', etc.
  start_time: string // '09:00:00'
  end_time: string // '10:00:00'
  subject_id: string
  subject_code: string
  subject_name: string
  faculty_id: string
  faculty_name: string
  batch_id: string
  batch_name: string
  classroom_id: string
  classroom_number: string
  is_lab: boolean
  is_elective: boolean
}

export interface TimetableReview {
  id: string
  workflow: string // UUID reference
  reviewer: {
    id: string
    username: string
    email: string
  }
  review_type: 'approve' | 'request_changes' | 'reject'
  comments: string
  created_at: string
}

export interface FixedSlot {
  id: string
  organization_id: string
  department_id: string
  semester: number
  subject_id: string
  faculty_id: string
  day: string
  start_time: string
  end_time: string
  classroom_id: string | null
  is_active: boolean
  created_by: string
  created_at: string
  reason: string
}

export interface Shift {
  id: string
  organization_id: string
  shift_name: string
  shift_code: string
  start_time: string
  end_time: string
  break_start: string
  break_end: string
  working_days: string[]
  is_active: boolean
}

// ============================================
// LEGACY MODELS (for compatibility)
// ============================================

export interface Timetable {
  id: string
  name: string
  academic_year: string
  semester: number
  created_at: string
  updated_at: string
  is_active: boolean
  generation_job: string | null // UUID reference
}

export interface TimetableSlot {
  id: string
  timetable: string // UUID reference
  day: string
  start_time: string
  end_time: string
  subject: string // UUID reference
  faculty: string // UUID reference
  batch: string // UUID reference
  classroom: string // UUID reference
}

// ============================================
// UI-SPECIFIC INTERFACES
// ============================================

export interface TimetableListItem {
  id: string
  year: number
  batch: string
  department: string
  semester: number
  status: 'approved' | 'pending' | 'draft' | 'rejected'
  lastUpdated: string
  conflicts: number
  score?: number
  academic_year: string
  variant_id?: string
  job_id?: string
}

export interface FacultyAvailability {
  id: string
  name: string
  available: boolean
  email?: string
  department?: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GenerateTimetableRequest {
  department_id: string
  batch_ids: string[]
  semester: number
  academic_year: string
  organization_id: string
  num_variants?: number // Default 5
  constraints?: {
    max_classes_per_day?: number
    max_consecutive_classes?: number
    min_break_duration_minutes?: number
    lunch_break_start?: string
    lunch_break_end?: string
  }
  fixed_slots?: Array<{
    subject_id: string
    faculty_id: string
    day: string
    start_time: string
    end_time: string
    classroom_id?: string
  }>
}

export interface GenerateTimetableResponse {
  success: boolean
  job_id: string
  workflow_id: string
  message: string
  estimated_time_seconds: number
  websocket_url: string
}

export interface VariantComparisonData {
  variants: TimetableVariant[]
  comparison_metrics: {
    best_score: number
    best_conflict_count: number
    average_score: number
    score_range: [number, number]
  }
}

export interface ApprovalRequest {
  variant_id: string
  comments?: string
  review_type: 'approve' | 'request_changes' | 'reject'
}

export interface ApprovalResponse {
  success: boolean
  workflow_id: string
  status: string
  message: string
}
