'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { authenticatedFetch } from '@/lib/auth'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

export default function CreateTimetablePage() {
  const router = useRouter()
  const { user } = useAuth()
  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  const [formData, setFormData] = useState({
    academic_year: '2024-2025',
    semester: 'odd',
    working_days: 6,
    slots_per_day: 9,
    start_time: '08:00',
    end_time: '17:00',
    lunch_break_enabled: true,
    lunch_break_start: '12:00',
    lunch_break_end: '13:00',
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

      const response = await authenticatedFetch(`${API_BASE}/generation-jobs/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          academic_year: formData.academic_year,
          semester: formData.semester,
          org_id: user.organization,
          config: formData,
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Generate Timetable</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Configure time slots and generate timetable for all departments</p>
        </div>
        <button
          type="submit"
          form="timetable-form"
          disabled={isGenerating}
          className="btn-primary"
        >
          {isGenerating ? (
            <>
              <GoogleSpinner size={16} singleColor="white" className="mr-2" />
              Generating...
            </>
          ) : (
            'Generate Timetable'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)' }}>
          <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
        </div>
      )}

      <form id="timetable-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text-primary)' }}>Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        </div>

        <div className="card">
          <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text-primary)' }}>Schedule Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="form-group">
              <label htmlFor="working-days" className="form-label">Working Days</label>
              <input
                type="number"
                id="working-days"
                className="input-primary"
                value={formData.working_days}
                onChange={e => setFormData({ ...formData, working_days: parseInt(e.target.value) })}
                min="5"
                max="7"
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="slots-per-day" className="form-label">Slots Per Day</label>
              <input
                type="number"
                id="slots-per-day"
                className="input-primary"
                value={formData.slots_per_day}
                onChange={e => setFormData({ ...formData, slots_per_day: parseInt(e.target.value) })}
                min="6"
                max="12"
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="start-time" className="form-label">Start Time</label>
              <input
                type="time"
                id="start-time"
                className="input-primary"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end-time" className="form-label">End Time</label>
              <input
                type="time"
                id="end-time"
                className="input-primary"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="mt-6 p-5 rounded-lg" style={{ background: 'var(--color-bg-surface-2)', border: '1px solid var(--color-border)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.lunch_break_enabled}
                onChange={e => setFormData({ ...formData, lunch_break_enabled: e.target.checked })}
                disabled={isGenerating}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Enable Lunch Break</span>
            </label>
            {formData.lunch_break_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <div className="form-group">
                  <label htmlFor="lunch-start" className="form-label">Break Start Time</label>
                  <input
                    type="time"
                    id="lunch-start"
                    className="input-primary"
                    value={formData.lunch_break_start}
                    onChange={e => setFormData({ ...formData, lunch_break_start: e.target.value })}
                    disabled={isGenerating}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lunch-end" className="form-label">Break End Time</label>
                  <input
                    type="time"
                    id="lunch-end"
                    className="input-primary"
                    value={formData.lunch_break_end}
                    onChange={e => setFormData({ ...formData, lunch_break_end: e.target.value })}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  )
}
