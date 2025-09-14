'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard-layout'

interface Timetable {
  id: number
  name: string
  department: string
  semester: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  score?: number
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

export default function TimetableManagementPage() {
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchTimetables()
  }, [])

  const fetchTimetables = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/timetables/')
      const data = await response.json()
      setTimetables(data.timetables || [])
    } catch (error) {
      console.error('Failed to fetch timetables:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTimetables = timetables.filter(t => 
    statusFilter === 'all' || t.status === statusFilter
  )

  const groupedTimetables = filteredTimetables.reduce((acc, timetable) => {
    const dept = timetable.department
    if (!acc[dept]) acc[dept] = {}
    const key = `Semester ${timetable.semester}`
    if (!acc[dept][key]) acc[dept][key] = []
    acc[dept][key].push(timetable)
    return acc
  }, {} as Record<string, Record<string, Timetable[]>>)

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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
            Timetable Management
          </h1>
          <Link 
            href="/admin/timetables/create"
            className="btn-primary w-full sm:w-auto text-center"
          >
            <span className="mr-2">➕</span>
            Create New Timetable
          </Link>
        </div>

        {/* Status Filters */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Filter by Status</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'approved', label: 'Approved' },
              { key: 'pending', label: 'Pending Review' },
              { key: 'draft', label: 'Draft' },
              { key: 'rejected', label: 'Rejected' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  statusFilter === filter.key
                    ? 'nav-link-active'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-[#2d2d30] dark:border-[#3c4043] dark:text-gray-300 dark:hover:bg-[#3c4043]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timetables List */}
        {Object.keys(groupedTimetables).length === 0 ? (
          <div className="card">
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No timetables found</p>
              <Link 
                href="/admin/timetables/create"
                className="btn-primary inline-flex items-center"
              >
                <span className="mr-2">➕</span>
                Create Your First Timetable
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {Object.entries(groupedTimetables).map(([department, semesters]) => (
              <div key={department} className="card">
                <div className="card-header">
                  <h3 className="card-title capitalize">{department} Department</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(semesters).map(([semester, timetableList]) => (
                    <div key={semester}>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 px-1">
                        {semester}
                      </h4>
                      <div className="space-y-2">
                        {timetableList.map(timetable => (
                          <div 
                            key={timetable.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-gray-200 dark:border-[#3c4043] rounded-lg hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {timetable.name}
                                </h5>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[timetable.status]}`}>
                                  {timetable.status}
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>Created: {new Date(timetable.created_at).toLocaleDateString()}</span>
                                {timetable.score && (
                                  <span>Score: {timetable.score.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              {timetable.status === 'pending' ? (
                                <Link
                                  href={`/admin/timetables/${timetable.id}/review`}
                                  className="btn-secondary text-center text-sm px-3 py-2"
                                >
                                  Review Options
                                </Link>
                              ) : timetable.status === 'approved' ? (
                                <Link
                                  href={`/admin/timetables/${timetable.id}/view`}
                                  className="btn-secondary text-center text-sm px-3 py-2"
                                >
                                  View Timetable
                                </Link>
                              ) : (
                                <Link
                                  href={`/admin/timetables/${timetable.id}/edit`}
                                  className="btn-secondary text-center text-sm px-3 py-2"
                                >
                                  Edit
                                </Link>
                              )}
                              <button className="btn-danger text-sm px-3 py-2">
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}