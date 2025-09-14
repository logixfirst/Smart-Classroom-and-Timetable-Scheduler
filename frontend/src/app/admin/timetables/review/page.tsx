'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'

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
  created_at: string
}

export default function TimetableReviewPage() {
  const [timetables, setTimetables] = useState<TimetableOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingTimetables()
  }, [])

  const fetchPendingTimetables = async () => {
    try {
      const response = await fetch('/api/v1/timetables/pending/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      setTimetables(data.timetables || [])
    } catch (error) {
      console.error('Failed to fetch timetables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await fetch(`/api/v1/timetables/${id}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      alert('Timetable approved successfully!')
      fetchPendingTimetables()
    } catch (error) {
      alert('Failed to approve timetable')
    }
  }

  const handleReject = async (id: number) => {
    try {
      await fetch(`/api/v1/timetables/${id}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      alert('Timetable rejected successfully!')
      fetchPendingTimetables()
    } catch (error) {
      alert('Failed to reject timetable')
    }
  }

  const renderScheduleGrid = (schedule: TimeSlot[]) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const times = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00']
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 dark:border-[#3c4043]">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#3c4043]">
              <th className="p-2 border border-gray-200 dark:border-[#5f6368]">Time</th>
              {days.map(day => (
                <th key={day} className="p-2 border border-gray-200 dark:border-[#5f6368] capitalize">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time}>
                <td className="p-2 border border-gray-200 dark:border-[#3c4043] font-medium">{time}</td>
                {days.map(day => {
                  const slot = schedule.find(s => s.day === day && s.time === time)
                  return (
                    <td key={`${day}-${time}`} className="p-1 border border-gray-200 dark:border-[#3c4043]">
                      {slot && (
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded text-xs">
                          <div className="font-medium">{slot.subject}</div>
                          <div className="text-gray-600 dark:text-gray-400">{slot.faculty}</div>
                          <div className="text-gray-500 dark:text-gray-500">{slot.classroom}</div>
                        </div>
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
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
          Review Timetables
        </h1>

        {timetables.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No pending timetables for review</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {timetables.map((timetable) => (
              <div key={timetable.id} className="card">
                <div className="card-header">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="card-title">{timetable.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Score: {timetable.score.toFixed(1)} | Conflicts: {timetable.conflicts.length}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={() => handleApprove(timetable.id)}
                        className="btn-success w-full sm:w-auto"
                      >
                        ✅ Approve
                      </button>
                      <button 
                        onClick={() => handleReject(timetable.id)}
                        className="btn-danger w-full sm:w-auto"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </div>

                {timetable.conflicts.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Conflicts:</h4>
                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                      {timetable.conflicts.map((conflict, idx) => (
                        <li key={idx}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {renderScheduleGrid(timetable.schedule)}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}