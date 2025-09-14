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
  score: number
  conflicts: string[]
  schedule: TimeSlot[]
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
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (timetableId) {
      fetchTimetableData()
    }
  }, [timetableId])

  const fetchTimetableData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/timetables/${timetableId}/`)
      const data = await response.json()
      setTimetableData(data)
    } catch (error) {
      console.error('Failed to fetch timetable data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (optionId: number) => {
    try {
      await fetch(`http://localhost:8000/api/v1/timetables/${timetableId}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId })
      })
      alert('Timetable approved successfully!')
      router.push('/admin/timetables')
    } catch (error) {
      alert('Failed to approve timetable')
    }
  }

  const handleReject = async () => {
    try {
      await fetch(`http://localhost:8000/api/v1/timetables/${timetableId}/reject/`, {
        method: 'POST'
      })
      alert('Timetable rejected successfully!')
      router.push('/admin/timetables')
    } catch (error) {
      alert('Failed to reject timetable')
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
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
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentOption = timetableData.options[activeTab]

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">
              Review: {timetableData.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {timetableData.department} • Semester {timetableData.semester}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-sm font-medium">
              Pending Review
            </span>
          </div>
        </div>

        {/* Options Tabs */}
        <div className="card">
          <div className="border-b border-gray-200 dark:border-[#3c4043]">
            <nav className="flex space-x-1 overflow-x-auto">
              {timetableData.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === index
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Option {index + 1}
                  <span className="ml-2 text-xs">
                    ({option.score.toFixed(1)})
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Option Details */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Score: {currentOption.score.toFixed(1)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Conflicts: {currentOption.conflicts.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => handleApprove(currentOption.id)}
                  className="btn-success w-full sm:w-auto"
                >
                  ✅ Approve This Option
                </button>
                <button
                  onClick={handleReject}
                  className="btn-danger w-full sm:w-auto"
                >
                  ❌ Reject All Options
                </button>
              </div>
            </div>

            {/* Conflicts */}
            {currentOption.conflicts.length > 0 && (
              <div className="mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  Conflicts in this option:
                </h4>
                <ul className="text-xs sm:text-sm text-red-700 dark:text-red-400 space-y-1">
                  {currentOption.conflicts.map((conflict, idx) => (
                    <li key={idx}>• {conflict}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timetable Grid */}
            <div className="overflow-hidden">
              <TimetableGrid schedule={currentOption.schedule} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => router.push('/admin/timetables')}
            className="btn-secondary"
          >
            ← Back to Management
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
              disabled={activeTab === 0}
              className="btn-secondary disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveTab(Math.min(timetableData.options.length - 1, activeTab + 1))}
              disabled={activeTab === timetableData.options.length - 1}
              className="btn-secondary disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}