'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import InContentNav from '@/components/ui/InContentNav'
import { useAuth } from '@/context/AuthContext'
import {
  fetchTimetableWorkflows,
  transformWorkflowsToListItems,
  fetchFacultyAvailability,
  updateFacultyAvailability,
} from '@/lib/api/timetable'
import type { TimetableListItem, FacultyAvailability } from '@/types/timetable'

export default function AdminTimetablesPage() {
  const [activeYear, setActiveYear] = useState('all')
  const [timetables, setTimetables] = useState<TimetableListItem[]>([])
  const [facultyAvailability, setFacultyAvailability] = useState<FacultyAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()

  useEffect(() => {
    loadTimetableData()
    loadFacultyData()
  }, [])

  const loadTimetableData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get organization_id from authenticated user
      const workflows = await fetchTimetableWorkflows({
        organization_id: user?.organization,
      })

      const listItems = transformWorkflowsToListItems(workflows)
      setTimetables(listItems)
    } catch (err) {
      console.error('Failed to load timetables:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timetables')
      // Set empty array on error so UI doesn't break
      setTimetables([])
    } finally {
      setLoading(false)
    }
  }

  const loadFacultyData = async () => {
    try {
      // Get department_id and organization_id from authenticated user
      const faculty = await fetchFacultyAvailability({
        department_id: user?.department,
        organization_id: user?.organization,
      })
      setFacultyAvailability(faculty)
    } catch (err) {
      console.error('Failed to load faculty:', err)
      // Don't set error state for faculty - it's not critical
      setFacultyAvailability([])
    }
  }

  const toggleFacultyAvailability = async (facultyId: string) => {
    // Optimistically update UI
    setFacultyAvailability(prev =>
      prev.map(faculty =>
        faculty.id === facultyId ? { ...faculty, available: !faculty.available } : faculty
      )
    )

    // Update backend
    try {
      const faculty = facultyAvailability.find(f => f.id === facultyId)
      if (faculty) {
        await updateFacultyAvailability(facultyId, !faculty.available)
      }
    } catch (err) {
      console.error('Failed to update faculty availability:', err)
      // Revert optimistic update on error
      setFacultyAvailability(prev =>
        prev.map(faculty =>
          faculty.id === facultyId ? { ...faculty, available: !faculty.available } : faculty
        )
      )
      alert('Failed to update faculty availability. Please try again.')
    }
  }

  const getFilteredTimetables = () => {
    if (activeYear === 'all') return timetables
    return timetables.filter(t => t.year === parseInt(activeYear))
  }

  const getGroupedTimetables = () => {
    const filtered = getFilteredTimetables()
    const grouped: { [key: number]: TimetableListItem[] } = {}

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
      case 'approved':
        return 'text-[#4CAF50] bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20'
      case 'pending':
        return 'text-[#FF9800] bg-[#FF9800]/10 dark:bg-[#FF9800]/20'
      case 'draft':
        return 'text-[#6B6B6B] dark:text-[#B3B3B3] bg-[#E0E0E0] dark:bg-[#404040]'
      case 'rejected':
        return 'text-[#F44336] bg-[#F44336]/10 dark:bg-[#F44336]/20'
      default:
        return 'text-[#6B6B6B] dark:text-[#B3B3B3] bg-[#E0E0E0] dark:bg-[#404040]'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅'
      case 'pending':
        return '⏳'
      case 'draft':
        return '📝'
      case 'rejected':
        return '❌'
      default:
        return '📄'
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

  if (error) {
    return (
      <DashboardLayout role="admin">
        <div className="space-y-6">
          <div className="card border-[#F44336] bg-[#F44336]/5">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-[#F44336]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-[#F44336]">Error Loading Timetables</h3>
              </div>
            </div>
            <p className="text-sm text-[#2C2C2C] dark:text-[#FFFFFF]">{error}</p>
            <button onClick={loadTimetableData} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      role="admin"
      pageTitle="Timetable Management"
      pageDescription="Manage and optimize timetables across all departments"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex flex-col sm:flex-row gap-3 ml-auto">
            <a
              href="/admin/timetables/new"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.879-1.453l-.548-.547z"
                />
              </svg>
              <span className="hidden sm:inline">Generate New Timetable</span>
              <span className="sm:hidden">Generate</span>
            </a>
          </div>
        </div>

        {/* Faculty Availability Card */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2196F3]/10 dark:bg-[#2196F3]/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#2196F3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="card-title">Faculty Availability</h3>
                <p className="text-sm text-[#6B6B6B] dark:text-[#B3B3B3] mt-1">
                  Manage faculty availability for scheduling
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {facultyAvailability.map(faculty => (
              <div key={faculty.id} className="card flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-[#2196F3]/10 dark:bg-[#2196F3]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-[#2196F3]">
                      {faculty.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[#2C2C2C] dark:text-[#FFFFFF] truncate">
                    {faculty.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFacultyAvailability(faculty.id)}
                  aria-label={`Toggle availability for ${faculty.name}`}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#121212] ${
                    faculty.available ? 'bg-[#2196F3]' : 'bg-[#E0E0E0] dark:bg-[#404040]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
                      faculty.available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modern Navigation Tabs */}
        <div className="border-b border-[#E0E0E0] dark:border-[#2A2A2A]">
          <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveYear(item.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-300 ${
                  activeYear === item.id
                    ? 'border-[#2196F3] text-[#2196F3]'
                    : 'border-transparent text-[#6B6B6B] dark:text-[#B3B3B3] hover:text-[#2C2C2C] dark:hover:text-[#FFFFFF] hover:border-[#E0E0E0] dark:hover:border-[#404040]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 ${
                    activeYear === item.id
                      ? 'bg-[#2196F3]/10 text-[#2196F3]'
                      : 'bg-[#E0E0E0] dark:bg-[#404040] text-[#6B6B6B] dark:text-[#B3B3B3]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Timetables Hierarchical View */}
        <div className="space-y-4 sm:space-y-6">
          {Object.keys(groupedTimetables).length === 0 ? (
            <div className="card">
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">📅</div>
                <h3 className="text-base sm:text-lg font-medium text-[#0f0f0f] dark:text-white mb-2">
                  No Timetables Found
                </h3>
                <p className="text-sm text-[#606060] dark:text-[#aaaaaa] mb-4 sm:mb-6 px-4">
                  {activeYear === 'all'
                    ? 'No timetables have been created yet.'
                    : `No timetables found for ${
                        activeYear === '1'
                          ? '1st'
                          : activeYear === '2'
                            ? '2nd'
                            : activeYear === '3'
                              ? '3rd'
                              : '4th'
                      } year.`}
                </p>
                <a href="/admin/timetables/new" className="btn-primary">
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
                        {year === '1' ? '1st' : year === '2' ? '2nd' : year === '3' ? '3rd' : '4th'}{' '}
                        Year Timetables
                      </h3>
                      <span className="badge badge-info">
                        {yearTimetables.length} {yearTimetables.length === 1 ? 'batch' : 'batches'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                    {yearTimetables
                      .sort((a, b) => a.batch.localeCompare(b.batch))
                      .map(timetable => (
                        <a
                          key={timetable.id}
                          href={`/admin/timetables/${timetable.id}/review`}
                          className="block p-3 sm:p-4 bg-white dark:bg-[#1E1E1E] border border-[#E0E0E0] dark:border-[#2A2A2A]"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[#2C2C2C] dark:text-[#FFFFFF] truncate">
                                {timetable.department} - Section {timetable.batch}
                              </h4>
                              <p className="text-sm text-[#6B6B6B] dark:text-[#B3B3B3]">
                                Semester {timetable.semester}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(
                                timetable.status
                              )}`}
                            >
                              <span className="hidden sm:inline">
                                {getStatusIcon(timetable.status)}{' '}
                              </span>
                              {timetable.status.charAt(0).toUpperCase() + timetable.status.slice(1)}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[#606060] dark:text-[#aaaaaa]">
                                Last Updated:
                              </span>
                              <span className="text-[#0f0f0f] dark:text-white">
                                {timetable.lastUpdated}
                              </span>
                            </div>

                            {timetable.score && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#606060] dark:text-[#aaaaaa]">Score:</span>
                                <span className="font-medium text-[#00ba7c]">
                                  {timetable.score}/10
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[#606060] dark:text-[#aaaaaa]">Conflicts:</span>
                              <span
                                className={`font-medium ${
                                  timetable.conflicts > 0 ? 'text-[#ff4444]' : 'text-[#00ba7c]'
                                }`}
                              >
                                {timetable.conflicts}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-[#e5e5e5] dark:border-[#3d3d3d]">
                            <span className="text-xs text-[#065fd4] font-medium group-hover:text-[#0856c1] transition-colors duration-200">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#00ba7c]">
              {timetables.filter(t => t.status === 'approved').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">
              Approved
            </div>
          </div>
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#f9ab00]">
              {timetables.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">
              Pending
            </div>
          </div>
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#606060] dark:text-[#aaaaaa]">
              {timetables.filter(t => t.status === 'draft').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">Draft</div>
          </div>
          <div className="card text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#ff4444]">
              {timetables.filter(t => t.status === 'rejected').length}
            </div>
            <div className="text-xs sm:text-sm text-[#606060] dark:text-[#aaaaaa] mt-1">
              Rejected
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
