'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import InContentNav from '@/components/ui/InContentNav'

interface TimetableItem {
  id: string
  year: number
  batch: string
  department: string
  semester: string
  status: 'approved' | 'pending' | 'draft' | 'rejected'
  lastUpdated: string
  conflicts: number
  score?: number
}

interface FacultyAvailability {
  id: string
  name: string
  available: boolean
}

export default function AdminTimetablesPage() {
  const [activeYear, setActiveYear] = useState('all')
  const [timetables, setTimetables] = useState<TimetableItem[]>([])
  const [facultyAvailability, setFacultyAvailability] = useState<FacultyAvailability[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set static mock data instead of API calls
    const mockTimetables: TimetableItem[] = [
      {
        id: '1',
        year: 2,
        batch: 'A',
        department: 'Computer Science',
        semester: '4',
        status: 'approved',
        lastUpdated: new Date().toLocaleDateString(),
        conflicts: 0,
        score: 95
      },
      {
        id: '2',
        year: 3,
        batch: 'B',
        department: 'Computer Science',
        semester: '5',
        status: 'pending',
        lastUpdated: new Date().toLocaleDateString(),
        conflicts: 2,
        score: 87
      }
    ]
    
    const mockFacultyAvailability: FacultyAvailability[] = [
      { id: '1', name: 'Dr. Rajesh Kumar', available: true },
      { id: '2', name: 'Dr. Priya Sharma', available: true },
      { id: '3', name: 'Prof. Amit Singh', available: false }
    ]
    
    setTimetables(mockTimetables)
    setFacultyAvailability(mockFacultyAvailability)
    setLoading(false)
  }, [])

  const toggleFacultyAvailability = async (facultyId: string) => {
    setFacultyAvailability(prev => 
      prev.map(faculty => 
        faculty.id === facultyId 
          ? { ...faculty, available: !faculty.available }
          : faculty
      )
    )
  }

  const getFilteredTimetables = () => {
    if (activeYear === 'all') return timetables
    return timetables.filter(t => t.year === parseInt(activeYear))
  }

  const getGroupedTimetables = () => {
    const filtered = getFilteredTimetables()
    const grouped: { [key: number]: TimetableItem[] } = {}
    
    filtered.forEach(timetable => {
      if (!grouped[timetable.year]) {
        grouped[timetable.year] = []
      }
      grouped[timetable.year].push(timetable)
    })
    
    return grouped
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'pending': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'draft': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
      case 'rejected': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅'
      case 'pending': return '⏳'
      case 'draft': return '📝'
      case 'rejected': return '❌'
      default: return '📄'
    }
  }

  const navItems = [
    { id: 'all', label: 'All Years', count: timetables.length },
    { id: '1', label: '1st Year', count: timetables.filter(t => t.year === 1).length },
    { id: '2', label: '2nd Year', count: timetables.filter(t => t.year === 2).length },
    { id: '3', label: '3rd Year', count: timetables.filter(t => t.year === 3).length },
    { id: '4', label: '4th Year', count: timetables.filter(t => t.year === 4).length },
  ]

  const groupedTimetables = getGroupedTimetables()

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading timetables...</p>
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
              Timetable Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage all timetables across years and batches
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <a href="/admin/timetables/create" className="btn-primary w-full sm:w-auto">
              <span className="mr-2">🧠</span>
              Generate New Timetable
            </a>
          </div>
        </div>

        {/* Faculty Availability */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Faculty Availability Management</h3>
            <p className="card-description">Toggle faculty availability for timetable generation</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {facultyAvailability.map((faculty) => (
              <div key={faculty.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mr-3">
                  {faculty.name}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFacultyAvailability(faculty.id)}
                  aria-label={`Toggle availability for ${faculty.name}`}
                  aria-pressed={faculty.available ? "true" : "false"}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    faculty.available ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      faculty.available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <InContentNav 
          items={navItems}
          activeItem={activeYear}
          onItemClick={setActiveYear}
        />

        {/* Timetables Hierarchical View */}
        <div className="space-y-4 sm:space-y-6">
          {Object.keys(groupedTimetables).length === 0 ? (
            <div className="card">
              <div className="text-center py-12">
                <div className="text-4xl sm:text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  No Timetables Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {activeYear === 'all' 
                    ? 'No timetables have been created yet.' 
                    : `No timetables found for ${activeYear === '1' ? '1st' : activeYear === '2' ? '2nd' : activeYear === '3' ? '3rd' : '4th'} year.`
                  }
                </p>
                <a href="/admin/timetables/create" className="btn-primary">
                  Create First Timetable
                </a>
              </div>
            </div>
          ) : (
            Object.entries(groupedTimetables)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([year, yearTimetables]) => (
                <div key={year} className="card">
                  <div className="card-header">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="card-title">
                        {year === '1' ? '1st' : year === '2' ? '2nd' : year === '3' ? '3rd' : '4th'} Year Timetables
                      </h3>
                      <span className="badge badge-info">
                        {yearTimetables.length} {yearTimetables.length === 1 ? 'batch' : 'batches'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {yearTimetables
                      .sort((a, b) => a.batch.localeCompare(b.batch))
                      .map((timetable) => (
                        <a
                          key={timetable.id}
                          href={`/admin/timetables/${timetable.id}/review`}
                          className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                {timetable.department} - Section {timetable.batch}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Semester {timetable.semester}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(timetable.status)}`}>
                              {getStatusIcon(timetable.status)} {timetable.status.charAt(0).toUpperCase() + timetable.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                              <span className="text-gray-800 dark:text-gray-200">{timetable.lastUpdated}</span>
                            </div>
                            
                            {timetable.score && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Score:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{timetable.score}/10</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Conflicts:</span>
                              <span className={`font-medium ${timetable.conflicts > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {timetable.conflicts}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              👁️ View Details →
                            </span>
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {timetables.filter(t => t.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Approved</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {timetables.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-gray-600 dark:text-gray-400">
              {timetables.filter(t => t.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Draft</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {timetables.filter(t => t.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Rejected</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}