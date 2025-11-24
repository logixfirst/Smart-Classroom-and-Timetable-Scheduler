/**
 * Timetable Variant Review & Approval Page
 * Multi-variant comparison with workflow management
 * Matches backend: TimetableWorkflow, TimetableVariant models
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

// Backend types matching Django models
interface TimetableEntry {
  day: number // 0-4 (Monday-Friday)
  time_slot: string
  subject_id: string
  subject_name: string
  subject_code: string
  faculty_id: string
  faculty_name: string
  batch_id: string
  batch_name: string
  classroom_id: string
  room_number: string
  duration_minutes: number
}

interface QualityMetrics {
  total_conflicts: number
  hard_constraint_violations: number
  soft_constraint_violations: number
  room_utilization_score: number
  faculty_workload_balance_score: number
  student_compactness_score: number
  overall_score: number
}

interface Statistics {
  total_classes: number
  total_hours: number
  unique_subjects: number
  unique_faculty: number
  unique_rooms: number
  average_classes_per_day: number
}

interface TimetableVariant {
  id: string
  job_id: string
  variant_number: number
  optimization_priority: string
  organization_id: string
  department_id: string
  semester: number
  academic_year: string
  timetable_entries: TimetableEntry[]
  statistics: Statistics
  quality_metrics: QualityMetrics
  is_selected: boolean
  selected_at: string | null
  selected_by: number | null
  generated_at: string
}

interface TimetableWorkflow {
  id: string
  variant: string | null
  job_id: string
  organization_id: string
  department_id: string
  semester: number
  academic_year: string
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published'
  created_by: number
  created_at: string
  submitted_for_review_at: string | null
  submitted_by: number | null
  published_at: string | null
  published_by: number | null
  timetable_entries: TimetableEntry[]
}

interface Review {
  id: string
  timetable: string
  reviewer: number
  reviewer_name: string
  reviewer_username: string
  action: 'approved' | 'rejected' | 'revision_requested'
  comments: string
  suggested_changes: any | null
  reviewed_at: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TimetableReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const workflowId = params.timetableId as string

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  const [workflow, setWorkflow] = useState<TimetableWorkflow | null>(null)
  const [variants, setVariants] = useState<TimetableVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  // View state
  const [activeVariant, setActiveVariant] = useState<TimetableVariant | null>(null)
  const [viewMode, setViewMode] = useState<'comparison' | 'detail'>('comparison')
  const [selectedDay, setSelectedDay] = useState(0)

  useEffect(() => {
    if (workflowId) {
      loadWorkflowData()
    }
  }, [workflowId])

  const loadWorkflowData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch workflow details
      const workflowRes = await fetch(`${API_BASE}/timetable/workflows/${workflowId}/`, {
        credentials: 'include',
      })

      if (!workflowRes.ok) {
        throw new Error('Failed to load workflow')
      }

      const workflowData = await workflowRes.json()
      setWorkflow(workflowData)

      // Fetch variants for this job
      if (workflowData.job_id) {
        const variantsRes = await fetch(
          `${API_BASE}/timetable/variants/?job_id=${workflowData.job_id}`,
          {
            credentials: 'include',
          }
        )

        if (variantsRes.ok) {
          const variantsData = await variantsRes.json()
          setVariants(variantsData)

          // Pre-select variant
          const selected = variantsData.find((v: TimetableVariant) => v.is_selected)
          if (selected) {
            setSelectedVariantId(selected.id)
            setActiveVariant(selected)
          } else if (variantsData.length > 0) {
            // Default to first variant
            setActiveVariant(variantsData[0])
          }
        }
      }
    } catch (err) {
      console.error('Failed to load workflow:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const handleVariantSelect = async (variantId: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`${API_BASE}/timetable/variants/${variantId}/select/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to select variant')
      }

      setSelectedVariantId(variantId)

      // Update local state
      setVariants(prev =>
        prev.map(v => ({
          ...v,
          is_selected: v.id === variantId,
        }))
      )

      // Reload workflow
      await loadWorkflowData()
    } catch (err) {
      console.error('Failed to select variant:', err)
      alert('Failed to select variant. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedVariantId) {
      alert('Please select a variant first')
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`${API_BASE}/timetable/workflows/${workflowId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          comments: approvalComments,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve timetable')
      }

      alert('Timetable approved successfully!')
      setShowApprovalModal(false)
      router.push('/admin/timetables')
    } catch (err) {
      console.error('Failed to approve:', err)
      alert('Failed to approve timetable. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`${API_BASE}/timetable/workflows/${workflowId}/reject/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          comments: rejectionReason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject timetable')
      }

      alert('Timetable rejected')
      setShowRejectionModal(false)
      router.push('/admin/timetables')
    } catch (err) {
      console.error('Failed to reject:', err)
      alert('Failed to reject timetable. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const renderTimetableGrid = (variant: TimetableVariant) => {
    // Group entries by day and time
    const grid: { [key: string]: TimetableEntry[] } = {}
    variant.timetable_entries.forEach(entry => {
      const key = `${entry.day}-${entry.time_slot}`
      if (!grid[key]) grid[key] = []
      grid[key].push(entry)
    })

    // Get unique time slots
    const timeSlots = Array.from(new Set(variant.timetable_entries.map(e => e.time_slot))).sort()

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              {DAYS.map(day => (
                <th
                  key={day}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {timeSlots.map(time => (
              <tr key={time}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {time}
                </td>
                {DAYS.map((_, dayIndex) => {
                  const entries = grid[`${dayIndex}-${time}`] || []
                  return (
                    <td key={dayIndex} className="px-4 py-4 text-sm">
                      {entries.length > 0 ? (
                        <div className="space-y-1">
                          {entries.map((entry, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs"
                            >
                              <div className="font-semibold text-blue-900 dark:text-blue-200">
                                {entry.subject_code}
                              </div>
                              <div className="text-blue-700 dark:text-blue-300">
                                {entry.faculty_name}
                              </div>
                              <div className="text-blue-600 dark:text-blue-400">
                                {entry.room_number}
                              </div>
                              <div className="text-blue-500 dark:text-blue-500 text-xs">
                                {entry.batch_name}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timetable variants...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/timetables')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Timetables
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Review Timetable Variants
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {workflow?.department_id} • Semester {workflow?.semester} •{' '}
                {workflow?.academic_year}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  workflow?.status === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : workflow?.status === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : workflow?.status === 'pending_review'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {workflow?.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/timetables')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Back
            </button>
            {workflow?.status === 'draft' && (
              <>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  disabled={!selectedVariantId || actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve Timetable
                </button>
                <button
                  onClick={() => setShowRejectionModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* Variants Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Compare Variants ({variants.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map(variant => (
              <div
                key={variant.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedVariantId === variant.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => {
                  setActiveVariant(variant)
                  setViewMode('detail')
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Variant {variant.variant_number}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {variant.optimization_priority.replace('_', ' ')}
                    </p>
                  </div>
                  {variant.is_selected && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                      Selected
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Overall Score:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {variant.quality_metrics.overall_score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Conflicts:</span>
                    <span
                      className={`font-semibold ${
                        variant.quality_metrics.total_conflicts === 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {variant.quality_metrics.total_conflicts}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Room Utilization:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {variant.quality_metrics.room_utilization_score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Classes:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {variant.statistics.total_classes}
                    </span>
                  </div>
                </div>

                {/* Select Button */}
                {!variant.is_selected && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleVariantSelect(variant.id)
                    }}
                    disabled={actionLoading}
                    className="mt-3 w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Select This Variant
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detailed View */}
        {activeVariant && viewMode === 'detail' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Variant {activeVariant.variant_number} - Detailed View
              </h2>
              <button
                onClick={() => setViewMode('comparison')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Back to Comparison
              </button>
            </div>

            {renderTimetableGrid(activeVariant)}
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Approve Timetable
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to approve this timetable? This action will make it available
                for publishing.
              </p>
              <textarea
                value={approvalComments}
                onChange={e => setApprovalComments(e.target.value)}
                placeholder="Optional comments..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Reject Timetable
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please provide a reason for rejecting this timetable.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                rows={3}
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
