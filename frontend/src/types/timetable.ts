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

/**
 * Backend entry shape as returned by /timetable/variants/{id}/entries/
 * Uses day as a number (0 = Monday…5 = Saturday) unlike the legacy TimetableEntry.
 */
export interface BackendTimetableEntry {
  day: number          // 0 = Monday … 5 = Saturday
  time_slot: string
  start_time?: string
  end_time?: string
  subject_id?: string
  subject_name?: string
  subject_code?: string
  faculty_id?: string
  faculty_name?: string
  batch_id?: string
  batch_name?: string
  classroom_id?: string
  room_number?: string
  duration_minutes?: number
  department_id?: string
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
  batch: string | null
  department: string
  semester: number
  status: 'approved' | 'pending' | 'pending_review' | 'draft' | 'rejected' | 'running' | 'completed' | 'failed'
  lastUpdated: string
  conflicts: number
  score?: number | null
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

// ============================================
// WORKFLOW LIST (Approvals page)
// ============================================

export type WorkflowStatus = 'completed' | 'approved' | 'rejected'

export interface WorkflowListItem {
  id: string
  status: WorkflowStatus
  academic_year: string
  semester: number | null
  created_at: string
  organization_id: string
}

// ============================================
// CONFLICT DETECTION RESPONSE
// ============================================

export interface ConflictItem {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  day: string
  time_slot: string
  message: string
  suggestion: string
  faculty?: string
  room?: string
  courses?: string[]
}

export interface ConflictDetectionResult {
  job_id: string
  variant_id: number
  conflicts: ConflictItem[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  total_entries: number
  acknowledged_indices: number[]
}

export interface ApprovalResponse {
  success: boolean
  workflow_id: string
  status: string
  message: string
}

// ============================================
// VARIANT SCORE CARD  (new — Google-style)
// ============================================

export interface VariantScoreCard {
  overall_score: number              // 0-100
  score_faculty_load: number         // 0-100  (higher = less overloaded)
  score_room_utilization: number     // 0-100
  score_student_gaps: number         // 0-100  (higher = fewer gaps)
  total_conflicts: number            // hard conflicts
  soft_violation_count: number       // soft constraint violations
  optimization_label: string         // "Faculty Optimized" | "Room Optimized" | "Student Experience"
  is_recommended: boolean            // true on variant with highest overall_score
}

/** A single schedulable entry with full metadata for the comparison grid */
export interface TimetableSlotDetailed {
  day: number                        // 0=Mon … 5=Sat
  time_slot: string                  // "09:00-10:00"
  subject_code: string
  subject_name: string
  faculty_id: string
  faculty_name: string
  room_number: string
  batch_name: string
  department_id: string
  year: number | null                // 1-4 or null for cross-dept
  section: string
  has_conflict: boolean
  conflict_description: string
  enrolled_count: number
  room_capacity: number
}

/** Result of the server-side diff between two variants */
export interface ComparisonResult {
  shared_slots: TimetableSlotDetailed[]
  only_in_a: TimetableSlotDetailed[]
  only_in_b: TimetableSlotDetailed[]
  conflicts_a: TimetableSlotDetailed[]
  conflicts_b: TimetableSlotDetailed[]
  summary: {
    identical: number
    diff_a: number
    diff_b: number
    conflicts_a: number
    conflicts_b: number
  }
}

/** Enriched variant as returned by /api/timetable/variants/?job_id=X */
export interface VariantSummary {
  id: string                         // "{job_id}-variant-{n}"
  job_id: string
  variant_number: number
  organization_id: string
  timetable_entries: TimetableSlotDetailed[]   // empty; populated via /entries/
  statistics: { total_classes: number; total_conflicts: number }
  quality_metrics: VariantScoreCard
  generated_at: string
}

/** Department option for the dropdown / tree */
export interface DepartmentOption {
  id: string
  name: string
  code: string
  total_entries?: number
}
