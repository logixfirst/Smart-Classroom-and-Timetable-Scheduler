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
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <GoogleSpinner size={48} className="mx-auto" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading cross-enrollment data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Cross-Enrollment Analysis</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>NEP 2020 Compliance — Track interdepartmental enrollments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Outgoing Students</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>{outgoing?.total_outgoing ?? 0}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>To {outgoing?.departments_count ?? 0} departments</p>
            </div>
            <svg className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Incoming Students</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-success-text)' }}>{incoming?.total_incoming ?? 0}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>From {incoming?.departments_count ?? 0} departments</p>
            </div>
            <svg className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {([
            { key: 'outgoing' as const, label: `Our Students → Other Departments (${outgoing?.total_outgoing ?? 0})` },
            { key: 'incoming' as const, label: `Other Students → Our Courses (${incoming?.total_incoming ?? 0})` },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={
                activeTab === tab.key
                  ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'transparent' }
                  : { borderBottomColor: 'transparent', color: 'var(--color-text-secondary)', background: 'transparent' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {activeTab === 'outgoing' && (
            outgoing?.outgoing_enrollments?.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No outgoing cross-enrollments found</p>
              : outgoing?.outgoing_enrollments?.map((enrollment: any, idx: number) => (
                <div key={idx} className="rounded-lg p-4" style={{ background: 'var(--color-info-subtle)', border: '1px solid var(--color-primary)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>→ {enrollment.target_department}</h3>
                    <span className="badge badge-info">{enrollment.course_count} courses</span>
                  </div>
                  <div className="space-y-1.5">
                    {enrollment.courses?.map((course: any, cidx: number) => (
                      <div key={cidx} className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-medium text-xs" style={{ color: 'var(--color-primary)' }}>{course.code}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{course.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}

          {activeTab === 'incoming' && (
            incoming?.incoming_enrollments?.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No incoming cross-enrollments found</p>
              : incoming?.incoming_enrollments?.map((enrollment: any, idx: number) => (
                <div key={idx} className="rounded-lg p-4" style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--color-success-text)' }}>← {enrollment.source_department}</h3>
                    <span className="badge badge-success">{enrollment.course_count} courses</span>
                  </div>
                  <div className="space-y-1.5">
                    {enrollment.courses?.map((course: any, cidx: number) => (
                      <div key={cidx} className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-medium text-xs" style={{ color: 'var(--color-success-text)' }}>{course.code}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{course.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* NEP 2020 Compliance Banner */}
      <div className="card" style={{ background: 'var(--color-info-subtle)', borderLeft: '4px solid var(--color-primary)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>NEP 2020 Compliant</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Cross-departmental enrollment tracking enables flexible learning paths and interdisciplinary education as per National Education Policy 2020.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
