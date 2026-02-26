'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function CrossEnrollmentPage() {
  const params = useParams()
  const router = useRouter()
  const timetableId = params.timetableId as string

  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing')
  const [outgoing, setOutgoing] = useState<any>(null)
  const [incoming, setIncoming] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [departmentId, setDepartmentId] = useState<string>('CSE')

  useEffect(() => {
    fetchData()
  }, [timetableId, departmentId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [outgoingRes, incomingRes] = await Promise.all([
        fetch(
          `${API_BASE}/cross-enrollment/outgoing/?job_id=${timetableId}&variant_id=0&department_id=${departmentId}`,
          { credentials: 'include' }
        ),
        fetch(
          `${API_BASE}/cross-enrollment/incoming/?job_id=${timetableId}&variant_id=0&department_id=${departmentId}`,
          { credentials: 'include' }
        )
      ])

      if (outgoingRes.ok) {
        const data = await outgoingRes.json()
        setOutgoing(data)
      }

      if (incomingRes.ok) {
        const data = await incomingRes.json()
        setIncoming(data)
      }
    } catch (error) {
      console.error('Failed to fetch cross-enrollment data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <GoogleSpinner size={48} className="mx-auto" />
            <p className="mt-4 text-gray-600">Loading cross-enrollment data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Cross-Enrollment Analysis</h1>
          <p className="text-gray-600 mt-2">NEP 2020 Compliance - Track interdepartmental enrollments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Outgoing Students</div>
                <div className="text-3xl font-bold text-blue-600">{outgoing?.total_outgoing || 0}</div>
                <div className="text-xs text-gray-500 mt-1">
                  To {outgoing?.departments_count || 0} departments
                </div>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Incoming Students</div>
                <div className="text-3xl font-bold text-green-600">{incoming?.total_incoming || 0}</div>
                <div className="text-xs text-gray-500 mt-1">
                  From {incoming?.departments_count || 0} departments
                </div>
              </div>
              <div className="text-4xl">←</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('outgoing')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'outgoing'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Our Students Taking Other Courses ({outgoing?.total_outgoing || 0})
              </button>
              <button
                onClick={() => setActiveTab('incoming')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'incoming'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Other Students Taking Our Courses ({incoming?.total_incoming || 0})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'outgoing' && (
              <div className="space-y-4">
                {outgoing?.outgoing_enrollments?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No outgoing cross-enrollments found
                  </div>
                ) : (
                  outgoing?.outgoing_enrollments?.map((enrollment: any, idx: number) => (
                    <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-blue-900">
                          → {enrollment.target_department}
                        </h3>
                        <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                          {enrollment.course_count} courses
                        </span>
                      </div>
                      <div className="space-y-2">
                        {enrollment.courses?.map((course: any, cidx: number) => (
                          <div key={cidx} className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-medium text-blue-700">{course.code}</span>
                            <span className="text-gray-700">{course.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {incoming?.incoming_enrollments?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No incoming cross-enrollments found
                  </div>
                ) : (
                  incoming?.incoming_enrollments?.map((enrollment: any, idx: number) => (
                    <div key={idx} className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-green-900">
                          ← {enrollment.source_department}
                        </h3>
                        <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                          {enrollment.course_count} courses
                        </span>
                      </div>
                      <div className="space-y-2">
                        {enrollment.courses?.map((course: any, cidx: number) => (
                          <div key={cidx} className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-medium text-green-700">{course.code}</span>
                            <span className="text-gray-700">{course.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* NEP 2020 Compliance Badge */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎓</div>
            <div>
              <h3 className="font-semibold text-purple-900">NEP 2020 Compliant</h3>
              <p className="text-sm text-purple-700 mt-1">
                Cross-departmental enrollment tracking enables flexible learning paths and interdisciplinary education as per National Education Policy 2020.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
