'use client'

import { useState, useEffect } from 'react'

interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
}

interface TimetableViewerProps {
  department?: string
  semester?: string
}

export default function TimetableViewer({ department, semester }: TimetableViewerProps) {
  const [timetable, setTimetable] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    department: department || '',
    batch: '',
    faculty: ''
  })

  useEffect(() => {
    fetchApprovedTimetable()
  }, [filters.department])

  const fetchApprovedTimetable = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.department) params.append('department', filters.department)
      if (semester) params.append('semester', semester)

      const response = await fetch(`/api/v1/timetables/approved/?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTimetable(data)
      } else {
        setTimetable(null)
      }
    } catch (error) {
      console.error('Failed to fetch timetable:', error)
      setTimetable(null)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredSchedule = () => {
    if (!timetable?.schedule) return []
    
    let filtered = timetable.schedule
    
    if (filters.batch) {
      filtered = filtered.filter((slot: TimeSlot) => slot.batch === filters.batch)
    }
    
    if (filters.faculty) {
      filtered = filtered.filter((slot: TimeSlot) => 
        slot.faculty.toLowerCase().includes(filters.faculty.toLowerCase())
      )
    }
    
    return filtered
  }

  const renderScheduleGrid = (schedule: TimeSlot[]) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const times = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00']
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 dark:border-[#3c4043] rounded-lg">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#3c4043]">
              <th className="p-3 border border-gray-200 dark:border-[#5f6368] font-medium">Time</th>
              {days.map(day => (
                <th key={day} className="p-3 border border-gray-200 dark:border-[#5f6368] font-medium capitalize">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time}>
                <td className="p-3 border border-gray-200 dark:border-[#3c4043] font-medium bg-gray-50 dark:bg-[#3c4043]">
                  {time}
                </td>
                {days.map(day => {
                  const slot = schedule.find(s => s.day === day && s.time === time)
                  return (
                    <td key={`${day}-${time}`} className="p-2 border border-gray-200 dark:border-[#3c4043] h-20">
                      {slot && (
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg h-full">
                          <div className="font-medium text-blue-800 dark:text-blue-300">{slot.subject}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{slot.faculty}</div>
                          <div className="text-xs text-blue-500 dark:text-blue-500">{slot.classroom}</div>
                          <div className="text-xs text-blue-400 dark:text-blue-600">{slot.batch}</div>
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
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    )
  }

  if (!timetable) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No approved timetable found</p>
        </div>
      </div>
    )
  }

  const filteredSchedule = getFilteredSchedule()
  const batches = [...new Set(timetable.schedule.map((slot: TimeSlot) => slot.batch))]
  const faculties = [...new Set(timetable.schedule.map((slot: TimeSlot) => slot.faculty))]

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{timetable.name}</h2>
          <p className="card-description">
            {timetable.department} • Semester {timetable.semester}
          </p>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="form-group">
            <label className="form-label">Department</label>
            <select 
              className="input-primary"
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
            >
              <option value="">All Departments</option>
              <option value="cs">Computer Science</option>
              <option value="math">Mathematics</option>
              <option value="physics">Physics</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Batch</label>
            <select 
              className="input-primary"
              value={filters.batch}
              onChange={(e) => setFilters({...filters, batch: e.target.value})}
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Faculty</label>
            <select 
              className="input-primary"
              value={filters.faculty}
              onChange={(e) => setFilters({...filters, faculty: e.target.value})}
            >
              <option value="">All Faculty</option>
              {faculties.map(faculty => (
                <option key={faculty} value={faculty}>{faculty}</option>
              ))}
            </select>
          </div>
        </div>

        {renderScheduleGrid(filteredSchedule)}
      </div>
    </div>
  )
}