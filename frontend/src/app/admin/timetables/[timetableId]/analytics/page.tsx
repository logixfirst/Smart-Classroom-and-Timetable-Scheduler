'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const timetableId = params.timetableId as string

  const [roomUtil, setRoomUtil] = useState<any>(null)
  const [facultyLoad, setFacultyLoad] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [timetableId])

  const fetchData = async () => {
    try {
      const [roomRes, facultyRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/room_utilization/?job_id=${timetableId}&variant_id=0`, { credentials: 'include' }),
        fetch(`${API_BASE}/analytics/faculty_load/?job_id=${timetableId}&variant_id=0`, { credentials: 'include' }),
        fetch(`${API_BASE}/analytics/summary/?job_id=${timetableId}&variant_id=0`, { credentials: 'include' })
      ])

      if (roomRes.ok) setRoomUtil(await roomRes.json())
      if (facultyRes.ok) setFacultyLoad(await facultyRes.json())
      if (summaryRes.ok) setSummary(await summaryRes.json())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUtilColor = (util: number) => {
    if (util > 70) return 'bg-green-500'
    if (util > 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getLoadColor = (status: string) => {
    if (status === 'overloaded') return 'bg-red-500'
    if (status === 'optimal') return 'bg-green-500'
    return 'bg-yellow-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <GoogleSpinner size={48} className="mx-auto" />
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 mb-4">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Resource Utilization Dashboard</h1>
          <p className="text-gray-600 mt-2">Optimize resource allocation with data-driven insights</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Classes</div>
              <div className="text-2xl font-bold text-gray-900">{summary.total_entries}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Avg Room Utilization</div>
              <div className="text-2xl font-bold text-blue-600">{summary.room_utilization}%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Avg Faculty Load</div>
              <div className="text-2xl font-bold text-green-600">{summary.faculty_avg_load}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Active Resources</div>
              <div className="text-2xl font-bold text-purple-600">{summary.total_rooms}R / {summary.total_faculty}F</div>
            </div>
          </div>
        )}

        {/* Room Utilization Heatmap */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Utilization Heatmap</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomUtil?.rooms?.slice(0, 12).map((room: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{room.room}</span>
                  <span className={`px-2 py-1 rounded text-xs text-white ${getUtilColor(room.utilization_percentage)}`}>
                    {room.utilization_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUtilColor(room.utilization_percentage)}`}
                    style={{ width: `${room.utilization_percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-2">{room.total_classes} classes</div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Load Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Faculty Teaching Load</h2>
          <div className="space-y-3">
            {facultyLoad?.faculty?.slice(0, 10).map((faculty: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-900">{faculty.faculty}</span>
                    <span className="text-sm text-gray-600 ml-2">({faculty.unique_courses} courses)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{faculty.total_classes} classes</span>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getLoadColor(faculty.load_status)}`}>
                      {faculty.load_status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getLoadColor(faculty.load_status)}`}
                    style={{ width: `${Math.min((faculty.total_classes / 25) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Courses: {faculty.courses?.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
