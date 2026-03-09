'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { authenticatedFetch } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import PageHeader from '@/components/shared/PageHeader'
import { Zap } from 'lucide-react'

/**
 * Compute the maximum number of 60-min slots that fit in the working window.
 *
 * Formula:
 *   effectiveMinutes = (end - start) - lunchBreak
 *   maxSlots         = floor(effectiveMinutes / 60)
 */
function computeMaxSlots(
  startTime: string,
  endTime: string,
  lunchEnabled: boolean,
  lunchStart: string,
  lunchEnd: string,
  slotDurationMinutes = 60,
): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const windowMinutes = toMinutes(endTime) - toMinutes(startTime)
  if (windowMinutes <= 0) return 1
  const lunchMinutes =
    lunchEnabled ? Math.max(0, toMinutes(lunchEnd) - toMinutes(lunchStart)) : 0
  const effectiveMinutes = windowMinutes - lunchMinutes
  return Math.max(1, Math.floor(effectiveMinutes / slotDurationMinutes))
}

const INITIAL_FORM = {
  academic_year: '2024-2025',
  semester: 'odd',
  working_days: 6,
  slots_per_day: 8,   // 08:00-17:00 minus 1 h lunch = 8 × 60-min slots
  start_time: '08:00',
  end_time: '17:00',
  lunch_break_enabled: true,
  lunch_break_start: '12:00',
  lunch_break_end: '13:00',
} as const

type FormData = {
  academic_year: string
  semester: string
  working_days: number
  slots_per_day: number
  start_time: string
  end_time: string
  lunch_break_enabled: boolean
  lunch_break_start: string
  lunch_break_end: string
}

export default function CreateTimetablePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM })

  const maxSlotsPerDay = useMemo(
    () =>
      computeMaxSlots(
        formData.start_time,
        formData.end_time,
        formData.lunch_break_enabled,
        formData.lunch_break_start,
        formData.lunch_break_end,
      ),
    [
      formData.start_time,
      formData.end_time,
      formData.lunch_break_enabled,
      formData.lunch_break_start,
      formData.lunch_break_end,
    ],
  )

  /**
   * Update formData and, whenever a time-config field changes, automatically
   * clamp slots_per_day so it never exceeds what the window can hold.
   */
  const updateFormData = (patch: Partial<FormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...patch }
      const max = computeMaxSlots(
        next.start_time,
        next.end_time,
        next.lunch_break_enabled,
        next.lunch_break_start,
        next.lunch_break_end,
      )
      if (next.slots_per_day > max) next.slots_per_day = max
      return next
    })
  }

  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.organization) {
      showToast('error', 'User organization not found')
      return
    }
    const safeSlotsPerDay = Math.min(formData.slots_per_day, maxSlotsPerDay)
    try {
      setIsGenerating(true)
      const response = await authenticatedFetch(`${API_BASE}/generation-jobs/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          academic_year: formData.academic_year,
          semester: formData.semester,
          org_id: user.organization,
          config: { ...formData, slots_per_day: safeSlotsPerDay },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to start generation')
      if (data.success) {
        router.push(`/admin/timetables/${data.job_id}/status`)
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to generate timetable')
    } finally {
      setIsGenerating(false)
    }
  }

  const lunchDurationMins = useMemo(() => {
    if (!formData.lunch_break_enabled) return 0
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
    return Math.max(0, toMins(formData.lunch_break_end) - toMins(formData.lunch_break_start))
  }, [formData.lunch_break_enabled, formData.lunch_break_start, formData.lunch_break_end])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Generate Timetable"
        parentLabel="Timetables"
        parentHref="/admin/timetables"
        primaryAction={{
          label: isGenerating ? 'Generating…' : 'Generate Timetable',
          icon: Zap,
          onClick: () => (document.getElementById('timetable-form') as HTMLFormElement | null)?.requestSubmit(),
        }}
        secondaryActions={
          isGenerating
            ? <GoogleSpinner size={20} className="mr-1" />
            : (
              <button
                type="button"
                onClick={() => router.push('/admin/timetables')}
                className="btn-secondary"
              >
                Cancel
              </button>
            )
        }
      />

      <form id="timetable-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Basic Information</h3>
            <p className="card-description">Select the academic year and term for this timetable</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="form-group">
              <label htmlFor="academic-year" className="form-label">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                id="academic-year"
                className="input-primary"
                value={formData.academic_year}
                onChange={e => updateFormData({ academic_year: e.target.value })}
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
                onChange={e => updateFormData({ semester: e.target.value })}
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
          <div className="card-header">
            <h3 className="card-title">Schedule Configuration</h3>
            <p className="card-description">Define working hours and daily slot structure</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="form-group">
              <label htmlFor="working-days" className="form-label">Working Days</label>
              <input
                type="number"
                id="working-days"
                className="input-primary"
                value={formData.working_days}
                onChange={e => updateFormData({ working_days: parseInt(e.target.value) })}
                min="5"
                max="7"
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="slots-per-day" className="form-label">
                Slots Per Day
                <span className={`ml-1.5 text-xs font-normal ${formData.slots_per_day >= maxSlotsPerDay ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-text-muted)]'}`}>
                  (max {maxSlotsPerDay})
                </span>
              </label>
              <input
                type="number"
                id="slots-per-day"
                className="input-primary"
                value={formData.slots_per_day}
                onChange={e =>
                  updateFormData({ slots_per_day: Math.min(parseInt(e.target.value) || 1, maxSlotsPerDay) })
                }
                min="1"
                max={maxSlotsPerDay}
                disabled={isGenerating}
              />
              {formData.slots_per_day >= maxSlotsPerDay && (
                <p className="form-help text-[var(--color-warning-text)]">
                  Max for {formData.start_time}–{formData.end_time}
                  {formData.lunch_break_enabled ? `, −${lunchDurationMins} min lunch` : ''}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="start-time" className="form-label">Start Time</label>
              <input
                type="time"
                id="start-time"
                className="input-primary"
                value={formData.start_time}
                onChange={e => updateFormData({ start_time: e.target.value })}
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
                onChange={e => updateFormData({ end_time: e.target.value })}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="mt-5 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-2)] border border-[var(--color-border)]">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.lunch_break_enabled}
                onChange={e => updateFormData({ lunch_break_enabled: e.target.checked })}
                disabled={isGenerating}
                className="w-4 h-4 rounded accent-[var(--color-primary)]"
              />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Enable Lunch Break</span>
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
                    onChange={e => updateFormData({ lunch_break_start: e.target.value })}
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
                    onChange={e => updateFormData({ lunch_break_end: e.target.value })}
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
