'use client'

import { useState, useEffect } from 'react'

const DAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

export default function WorkingDaysManager() {
  const [workingDays, setWorkingDays] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadWorkingDays()
  }, [])

  const loadWorkingDays = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings/working-days/')
      if (response.ok) {
        const data = await response.json()
        setWorkingDays(data.working_days || [])
      }
    } catch (error) {
      console.error('Failed to load working days:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = (dayId: string) => {
    setWorkingDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    )
  }

  const saveWorkingDays = async () => {
    setSaving(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings/working-days/update/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_days: workingDays }),
      })

      if (response.ok) {
        // Success feedback could be added here
      }
    } catch (error) {
      console.error('Failed to save working days:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Academic Calendar Settings</h3>
        </div>
        <div className="p-4 text-center">
          <div className="loading-spinner w-6 h-6 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Academic Calendar Settings</h3>
        <p className="card-description">Configure working days for timetable generation</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Working Days
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {DAYS.map(day => (
              <label
                key={day.id}
                className="flex items-center gap-2 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={workingDays.includes(day.id)}
                  onChange={() => handleDayToggle(day.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {day.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={saveWorkingDays}
            disabled={saving || workingDays.length === 0}
            className="btn-primary w-full sm:w-auto disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="loading-spinner w-4 h-4 mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            Selected: {workingDays.length} day{workingDays.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
