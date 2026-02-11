'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

// NEP 2020 / Harvard-style Timetable Generation
// NO batch selection - students enroll individually in subjects

interface SubjectEnrollmentSummary {
  subject_id: string
  subject_code: string
  subject_name: string
  subject_type: 'theory' | 'practical' | 'hybrid'
  total_enrolled: number
  core_enrolled: number
  elective_enrolled: number
  cross_dept_enrolled: number
  enrolled_students: string[] // student IDs
  primary_department: string
  cross_departments: string[]
}

interface FixedSlotInput {
  subject_id: string
  faculty_id: string
  day: number
  start_time: string
  end_time: string
}

interface Faculty {
  faculty_id: string
  faculty_name: string
  department_name?: string
}

export default function NEP2020TimetableForm() {
  const router = useRouter()
  const { user } = useAuth()

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'

  // Form State
  const [formData, setFormData] = useState({
    academic_year: '2024-25',
    semester: 1,
    num_variants: 5,
    include_cross_dept: true, // Include cross-department enrollments
  })

  // NEP 2020 Data
  const [enrollmentSummary, setEnrollmentSummary] = useState<SubjectEnrollmentSummary[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [fixedSlots, setFixedSlots] = useState<FixedSlotInput[]>([])

  // UI State
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [cacheKey, setCacheKey] = useState<string | null>(null)

  // Fetch enrollment summary when semester changes
  useEffect(() => {
    if (user?.organization && formData.semester) {
      loadEnrollmentData()
    }
  }, [formData.semester, formData.academic_year, user?.organization])

  const loadEnrollmentData = async () => {
    if (!user?.organization) return

    try {
      setIsLoading(true)
      setError(null)

      // Check Redis cache first
      const generatedCacheKey = `enrollment_${user.organization}_${formData.semester}_${formData.academic_year}`

      let cachedData = null
      try {
        const cacheRes = await fetch(
          `${API_BASE}/timetable/enrollment-cache/?cache_key=${generatedCacheKey}`,
          { credentials: 'include' }
        )
        if (cacheRes.ok) {
          const cacheResponse = await cacheRes.json()
          // Check if cache actually exists
          if (cacheResponse.exists && cacheResponse.data) {
            cachedData = cacheResponse.data
            console.log('✅ Cache HIT - Loading from Redis')
          } else {
            console.log('ℹ️ Cache MISS - Cache does not exist')
          }
        }
      } catch (err) {
        console.log('⚠️ Cache check failed:', err)
      }

      if (cachedData && cachedData.subjects && cachedData.subjects.length > 0) {
        // Load from cache
        setEnrollmentSummary(cachedData.subjects || [])
        setFaculty(cachedData.faculty || [])
        setCacheKey(generatedCacheKey)
        console.log(
          `✅ Loaded from cache: ${cachedData.subjects.length} subjects, ${
            cachedData.faculty?.length || 0
          } faculty`
        )
      } else {
        // Fetch from database
        console.log('📡 Fetching enrollment data...')

        const [enrollmentRes, facultyRes] = await Promise.all([
          fetch(
            `${API_BASE}/timetable/enrollments/?semester=${formData.semester}&academic_year=${formData.academic_year}&include_cross_dept=true`,
            { credentials: 'include' }
          ),
          fetch(`${API_BASE}/enrollment-faculty/?semester=${formData.semester}`, {
            credentials: 'include',
          }),
        ])

        let enrollData, facultyData

        if (enrollmentRes.ok) {
          enrollData = await enrollmentRes.json()
          // Backend returns {summary: [...], enrollments: [...], cross_department_summary: [...]}
          const subjects = enrollData.summary || enrollData.results || enrollData
          setEnrollmentSummary(Array.isArray(subjects) ? subjects : [])
          console.log(`✅ Loaded ${subjects?.length || 0} subjects with enrollments`)
        } else {
          console.error('❌ Failed to fetch enrollments:', enrollmentRes.status)
          setEnrollmentSummary([])
        }

        if (facultyRes.ok) {
          facultyData = await facultyRes.json()
          const faculties = facultyData.results || facultyData
          setFaculty(Array.isArray(faculties) ? faculties : [])
          console.log(`✅ Loaded ${faculties?.length || 0} faculty members`)
        } else {
          console.error('❌ Failed to fetch faculty:', facultyRes.status)
          setFaculty([])
        }

        // Store in Redis cache for future use
        if (enrollmentRes.ok && facultyRes.ok && enrollData && facultyData) {
          try {
            await fetch(`${API_BASE}/timetable/enrollment-cache/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                cache_key: generatedCacheKey,
                organization_id: user.organization,
                semester: formData.semester,
                academic_year: formData.academic_year,
                subjects: enrollData.results || enrollData,
                faculty: facultyData.results || facultyData,
                ttl_hours: 24,
              }),
            })
            setCacheKey(generatedCacheKey)
            console.log('✅ Data cached in Redis')
          } catch (cacheErr) {
            console.warn('⚠️ Failed to cache data:', cacheErr)
          }
        }
      }
    } catch (err) {
      console.error('❌ Failed to load enrollment data:', err)
      setError('Failed to load enrollment data')
    } finally {
      setIsLoading(false)
    }
  }

  const addFixedSlot = () => {
    setFixedSlots(prev => [
      ...prev,
      {
        subject_id: '',
        faculty_id: '',
        day: 0,
        start_time: '09:00',
        end_time: '10:00',
      },
    ])
  }

  const updateFixedSlot = (index: number, field: keyof FixedSlotInput, value: any) => {
    setFixedSlots(prev => prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)))
  }

  const removeFixedSlot = (index: number) => {
    setFixedSlots(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (enrollmentSummary.length === 0) {
      alert('No subjects with enrollments found. Please ensure students are enrolled in subjects.')
      return
    }

    if (!user?.organization) {
      alert('User organization not found')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      // NEP 2020 payload - Organization-wide student enrollments
      const requestPayload = {
        // Selection criteria
        semester: formData.semester,
        academic_year: formData.academic_year,
        organization_id: user.organization,

        // Generation options
        num_variants: formData.num_variants,
        include_cross_dept: formData.include_cross_dept,
        fixed_slots: fixedSlots.filter(slot => slot.subject_id && slot.faculty_id),

        // Enrollment data (or cache key)
        subjects: enrollmentSummary,
        redis_cache_key: cacheKey,
      }

      console.log('🚀 Generating NEP 2020 timetable:', requestPayload)

      const response = await fetch(`${API_BASE}/timetable/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestPayload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      if (data.success) {
        setJobId(data.job_id)
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (err) {
      console.error('Failed to generate timetable:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate timetable')
      setIsGenerating(false)
    }
  }

  if (isGenerating && jobId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Generating timetable...</p>
          <p className="mt-2 text-sm text-gray-500">Job ID: {jobId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header with Generate Button */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Generate Timetable
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                NEP 2020 • Student-based enrollment
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isLoading || enrollmentSummary.length === 0}
              className="btn-primary px-6 py-2.5 text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                '✨ Generate Timetable'
              )}
            </button>
          </div>
          
          {/* Error Display - Right below header */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700" title="Dismiss error">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Configuration Card - Google Style */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Configuration</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Set semester and year details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Google-style Semester Select */}
              <div className="relative">
                <select
                  value={formData.semester}
                  onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                  disabled={isGenerating || isLoading}
                  aria-label="Select semester"
                  className="peer w-full px-3 pt-6 pb-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
                <label className="absolute left-3 top-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Semester <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Google-style Year Input */}
              <div className="relative">
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                  disabled={isGenerating || isLoading}
                  placeholder="2024-25"
                  aria-label="Academic year"
                  className="peer w-full px-3 pt-6 pb-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
                <label className="absolute left-3 top-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Academic Year <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Google-style Variants Input */}
              <div className="relative">
                <input
                  type="number"
                  value={formData.num_variants}
                  onChange={e => setFormData({ ...formData, num_variants: parseInt(e.target.value) || 5 })}
                  min={3}
                  max={10}
                  disabled={isGenerating || isLoading}
                  placeholder="5"
                  aria-label="Number of variants"
                  className="peer w-full px-3 pt-6 pb-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
                <label className="absolute left-3 top-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Number of Variants (3-10)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment Summary */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading enrollment data...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subject Enrollments</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {enrollmentSummary.length} subjects • {enrollmentSummary.reduce((sum, s) => sum + s.total_enrolled, 0)} total enrollments
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadEnrollmentData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {enrollmentSummary.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    No subjects with enrollments found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Please ensure students are enrolled in subjects for the selected semester
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Core
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Elective
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Cross-Dept
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Department
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {enrollmentSummary.map(subj => (
                        <tr key={subj.subject_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {subj.subject_code}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subj.subject_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {subj.subject_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                            {subj.total_enrolled}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700 dark:text-gray-300">{subj.core_enrolled}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700 dark:text-gray-300">{subj.elective_enrolled}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            {subj.cross_dept_enrolled > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                {subj.cross_dept_enrolled}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {subj.primary_department}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed Slots (Optional) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Fixed Slots <span className="text-sm font-normal text-gray-500">(Optional)</span>
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pre-assign specific time slots to subjects</p>
                </div>
              </div>
              <button
                onClick={addFixedSlot}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Slot
              </button>
            </div>

            {fixedSlots.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No fixed slots defined</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fixedSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {/* Subject Select */}
                      <div className="relative">
                        <select
                          value={slot.subject_id}
                          onChange={e => updateFixedSlot(index, 'subject_id', e.target.value)}
                          aria-label="Select subject"
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select Subject</option>
                          {enrollmentSummary.map(subj => (
                            <option key={subj.subject_id} value={subj.subject_id}>
                              {subj.subject_code}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Faculty Select */}
                      <div className="relative">
                        <select
                          value={slot.faculty_id}
                          onChange={e => updateFixedSlot(index, 'faculty_id', e.target.value)}
                          aria-label="Select faculty"
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select Faculty</option>
                          {faculty.map(fac => (
                            <option key={fac.faculty_id} value={fac.faculty_id}>
                              {fac.faculty_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Day Select */}
                      <div className="relative">
                        <select
                          value={slot.day}
                          onChange={e => updateFixedSlot(index, 'day', parseInt(e.target.value))}
                          aria-label="Select day"
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                            <option key={i} value={i}>{day}</option>
                          ))}
                        </select>
                      </div>

                      {/* Time Inputs */}
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={e => updateFixedSlot(index, 'start_time', e.target.value)}
                        aria-label="Start time"
                        className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />

                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={e => updateFixedSlot(index, 'end_time', e.target.value)}
                          aria-label="End time"
                          className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => removeFixedSlot(index)}
                          className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove slot"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
