'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import TimetableGrid from '@/components/shared/TimetableGrid'

interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
}

interface TimetableOption {
  id: number
  name: string
  score: number
  conflicts: string[]
  schedule: TimeSlot[]
  description: string
}

interface TimetableData {
  id: number
  name: string
  department: string
  semester: string
  status: string
  options: TimetableOption[]
}

export default function ReviewTimetablePage() {
  const params = useParams()
  const router = useRouter()
  const timetableId = params.timetableId as string

  const [timetableData, setTimetableData] = useState<TimetableData | null>(null)
  const [selectedOption, setSelectedOption] = useState<TimetableOption | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (timetableId) {
      fetchTimetableData()
    }
  }, [timetableId])

  const fetchTimetableData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/timetables/${timetableId}/`)
      if (response.ok) {
        const data = await response.json()
        setTimetableData(data)
      } else {
        console.error('Failed to fetch timetable:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch timetable data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (optionId: number) => {
    setActionLoading(true)
    try {
      await fetch(`http://localhost:8000/api/v1/timetables/${timetableId}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      })
      alert('Timetable approved successfully!')
      router.push('/admin/timetables')
    } catch (error) {
      alert('Failed to approve timetable')
    } finally {
      setActionLoading(false)
      setShowModal(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await fetch(`http://localhost:8000/api/v1/timetables/${timetableId}/reject/`, {
        method: 'POST',
      })
      alert('All options rejected. Generate new timetable.')
      router.push('/admin/timetables')
    } catch (error) {
      alert('Failed to reject timetable')
    } finally {
      setActionLoading(false)
    }
  }

  const openModal = (option: TimetableOption) => {
    setSelectedOption(option)
    setShowModal(true)
  }

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-600 dark:text-green-400'
    if (score >= 7.5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 8.5)
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (score >= 7.5)
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading timetable options...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!timetableData) {
    return (
      <DashboardLayout role="admin">
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Timetable not found</p>
            <button onClick={() => router.push('/admin/timetables')} className="btn-secondary mt-4">
              ← Back to Management
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Review Generated Options
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {timetableData.department} • Semester {timetableData.semester} •{' '}
              {timetableData.options.length} Options Generated
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium">
              🧠 AI Generated
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-sm font-medium">
              Pending Review
            </span>
          </div>
        </div>

        {/* Options Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {timetableData.options.map((option, index) => (
            <div
              key={option.id}
              onClick={() => openModal(option)}
              className={`card hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 ${getScoreBg(option.score)} border-2`}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Option {index + 1}
                  </h3>
                  <span className={`text-2xl font-bold ${getScoreColor(option.score)}`}>
                    {option.score.toFixed(1)}
                  </span>
                </div>

                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {option.name}
                </h4>

                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {option.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Classes:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {option.schedule.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Conflicts:</span>
                    <span
                      className={`font-medium ${option.conflicts.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                    >
                      {option.conflicts.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button className="w-full text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                    👁️ View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <button
            onClick={() => router.push('/admin/timetables')}
            className="btn-secondary w-full sm:w-auto"
          >
            ← Back to Management
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading}
            className="btn-danger w-full sm:w-auto disabled:opacity-50"
          >
            {actionLoading ? (
              <>
                <div className="loading-spinner w-4 h-4 mr-2"></div>
                Rejecting...
              </>
            ) : (
              <>❌ Reject All & Regenerate</>
            )}
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">
                  {selectedOption.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Score:{' '}
                  <span className={`font-semibold ${getScoreColor(selectedOption.score)}`}>
                    {selectedOption.score.toFixed(1)}
                  </span>{' '}
                  • Conflicts:{' '}
                  <span
                    className={
                      selectedOption.conflicts.length > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }
                  >
                    {selectedOption.conflicts.length}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center text-gray-600 dark:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Description */}
              <div className="mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedOption.description}
                </p>
              </div>

              {/* Conflicts */}
              {selectedOption.conflicts.length > 0 && (
                <div className="mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                    ⚠️ Conflicts Detected:
                  </h4>
                  <ul className="text-xs sm:text-sm text-red-700 dark:text-red-400 space-y-1">
                    {selectedOption.conflicts.map((conflict, idx) => (
                      <li key={idx}>• {conflict}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timetable Grid */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                  📅 Full Schedule:
                </h4>
                <div className="overflow-x-auto">
                  <TimetableGrid schedule={selectedOption.schedule} />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary w-full sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={() => handleApprove(selectedOption.id)}
                disabled={actionLoading}
                className="btn-success w-full sm:w-auto disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Approving...
                  </>
                ) : (
                  <>✅ Approve This Option</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
