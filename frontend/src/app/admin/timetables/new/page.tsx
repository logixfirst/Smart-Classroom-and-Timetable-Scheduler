'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function CreateTimetablePage() {
  const router = useRouter()
  const { user } = useAuth()
  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  const [formData, setFormData] = useState({
    academic_year: '2024-2025',
    semester: 'odd',
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.organization) {
      setError('User organization not found')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      const response = await fetch(`${API_BASE}/generation-jobs/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          academic_year: formData.academic_year,
          semester: formData.semester,
          org_id: user.organization,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      if (data.success) {
        router.push(`/admin/timetables/status/${data.job_id}`)
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (err) {
      console.error('Failed to generate timetable:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate timetable')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Generate University Timetable</h3>
          <p className="card-description">
            Generate timetable for all 127 departments (8-11 minutes)
          </p>
        </div>

        {/* Feature Description */}
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            ℹ️ Generation Details
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>✅ Generates for all 127 departments automatically</li>
            <li>✅ Zero conflicts guaranteed (faculty, student, room)</li>
            <li>✅ NEP 2020 compliant with interdisciplinary courses</li>
            <li>✅ Estimated time: 8-11 minutes</li>
          </ul>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Generation Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Year */}
            <div className="form-group">
              <label htmlFor="academic-year" className="form-label">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                id="academic-year"
                className="input-primary"
                value={formData.academic_year}
                onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                disabled={isGenerating}
                required
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

            {/* Semester */}
            <div className="form-group">
              <label htmlFor="semester" className="form-label">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                id="semester"
                className="input-primary"
                value={formData.semester}
                onChange={e => setFormData({ ...formData, semester: e.target.value })}
                disabled={isGenerating}
                required
              >
                <option value="odd">Odd Semester</option>
                <option value="even">Even Semester</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button type="submit" disabled={isGenerating} className="btn-primary px-8 py-2">
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                'Generate Timetable'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
