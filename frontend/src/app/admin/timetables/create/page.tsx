'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

interface GenerationJob {
  job_id: string
  department_id?: string
  batch_id?: string
  department_name: string
  batch_name: string
  semester: number
  academic_year: string
  status: string
  progress: number
  created_at: string
  updated_at: string
}

export default function TimetableGeneratePage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
    department_id: '',
    batch_id: '',
    semester: '1',
    academic_year: '2024-25',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [progressInterval])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [deptResponse, batchResponse] = await Promise.all([
        apiClient.getDepartments(),
        apiClient.getBatches(),
      ])

      if (deptResponse.data) {
        const deptData = Array.isArray(deptResponse.data)
          ? deptResponse.data
          : deptResponse.data.results || []
        setDepartments(deptData)
      }

      if (batchResponse.data) {
        const batchData = Array.isArray(batchResponse.data)
          ? batchResponse.data
          : batchResponse.data.results || []
        setBatches(batchData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/generation-jobs/generate/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (data.success && data.job) {
        setCurrentJob(data.job)
        // Start polling for progress
        startProgressPolling(data.job.job_id)
      } else {
        alert('Failed to start generation: ' + (data.error || 'Unknown error'))
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('Error starting generation:', error)
      alert('Error starting generation')
      setIsGenerating(false)
    }
  }

  const startProgressPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/generation-jobs/${jobId}/progress/`,
          { credentials: 'include' }
        )
        const data = await response.json()

        if (data.success) {
          setCurrentJob(prev =>
            prev ? { ...prev, progress: data.progress, status: data.status } : null
          )

          // Stop polling if completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval)
            setIsGenerating(false)

            if (data.status === 'completed') {
              // Show success message
              alert('Timetable generation completed successfully!')
            }
          }
        }
      } catch (error) {
        console.error('Error fetching progress:', error)
      }
    }, 3000) // Poll every 3 seconds

    setProgressInterval(interval)
  }

  const handleRerun = async () => {
    if (!currentJob) return

    // For rerun, we need to use the original form data or try to find IDs from names
    // If IDs are available, use them; otherwise, find by names
    let departmentId = currentJob.department_id || formData.department_id
    let batchId = currentJob.batch_id || formData.batch_id

    // If IDs not available, try to find them by names
    if (!departmentId) {
      const dept = departments.find(d => d.department_name === currentJob.department_name)
      departmentId = dept?.department_id || ''
    }

    if (!batchId) {
      const batch = batches.find(b => b.batch_id === currentJob.batch_name)
      batchId = batch?.batch_id || ''
    }

    if (!departmentId || !batchId) {
      alert(
        'Cannot re-run: Department or Batch information not found. Please start a new generation.'
      )
      return
    }

    const rerunData = {
      department_id: departmentId,
      batch_id: batchId,
      semester: currentJob.semester,
      academic_year: currentJob.academic_year,
    }

    setIsGenerating(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/generation-jobs/generate/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rerunData),
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (data.success && data.job) {
        setCurrentJob(data.job)
        // Start polling for progress
        startProgressPolling(data.job.job_id)
      } else {
        alert('Failed to restart generation: ' + (data.error || 'Unknown error'))
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('Error restarting generation:', error)
      alert('Error restarting generation')
      setIsGenerating(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      queued: 'bg-gray-500',
      running: 'bg-blue-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      approved: 'bg-purple-500',
      rejected: 'bg-orange-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      queued: 'Queued',
      running: 'Generating...',
      completed: 'Completed',
      failed: 'Failed',
      approved: 'Approved',
      rejected: 'Rejected',
    }
    return statusMap[status] || status
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Generate Timetable
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-powered timetable generation with progress tracking
          </p>
        </div>
      </div>

      {/* Generation Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Generation Parameters</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Selection */}
            <div>
              <label htmlFor="department_id" className="block text-sm font-medium mb-2">
                Department *
              </label>
              <select
                id="department_id"
                value={formData.department_id}
                onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                className="input-primary"
                required
                disabled={isGenerating}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selection */}
            <div>
              <label htmlFor="batch_id" className="block text-sm font-medium mb-2">
                Batch *
              </label>
              <select
                id="batch_id"
                value={formData.batch_id}
                onChange={e => setFormData({ ...formData, batch_id: e.target.value })}
                className="input-primary"
                required
                disabled={isGenerating}
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    {batch.batch_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Selection */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium mb-2">
                Semester *
              </label>
              <select
                id="semester"
                value={formData.semester}
                onChange={e => setFormData({ ...formData, semester: e.target.value })}
                className="input-primary"
                required
                disabled={isGenerating}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label htmlFor="academic_year" className="block text-sm font-medium mb-2">
                Academic Year *
              </label>
              <input
                id="academic_year"
                type="text"
                value={formData.academic_year}
                onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                className="input-primary"
                placeholder="2024-25"
                required
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Timetable'}
            </button>
          </div>
        </form>
      </div>

      {/* Progress Section */}
      {currentJob && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Generation Progress</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Job ID:</p>
                <p className="font-mono text-sm">{currentJob.job_id}</p>
              </div>
              <span className={`badge ${getStatusColor(currentJob.status)} text-white`}>
                {getStatusText(currentJob.status)}
              </span>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-semibold">{currentJob.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-500 ease-out flex items-center justify-center"
                  style={{ width: `${currentJob.progress}%` }}
                >
                  {currentJob.progress > 10 && (
                    <span className="text-xs text-white font-medium">{currentJob.progress}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                <p className="font-medium">{currentJob.department_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Batch</p>
                <p className="font-medium">{currentJob.batch_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Semester</p>
                <p className="font-medium">Semester {currentJob.semester}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Academic Year</p>
                <p className="font-medium">{currentJob.academic_year}</p>
              </div>
            </div>

            {/* Action Buttons */}
            {currentJob.status === 'completed' && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => router.push(`/admin/timetables/${currentJob.job_id}`)}
                  className="btn-primary flex-1"
                >
                  View Generated Timetable
                </button>
                <button
                  onClick={() => {
                    setCurrentJob(null)
                    setIsGenerating(false)
                  }}
                  className="btn-secondary"
                >
                  Generate Another
                </button>
              </div>
            )}

            {currentJob.status === 'rejected' && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRerun}
                  className="btn-primary flex-1"
                  disabled={isGenerating}
                >
                  <span className="mr-2">🔄</span>
                  Re-run Generation
                </button>
                <button
                  onClick={() => {
                    setCurrentJob(null)
                    setIsGenerating(false)
                  }}
                  className="btn-secondary"
                >
                  Start New Generation
                </button>
              </div>
            )}

            {currentJob.status === 'failed' && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRerun}
                  className="btn-primary flex-1"
                  disabled={isGenerating}
                >
                  <span className="mr-2">🔄</span>
                  Retry Generation
                </button>
                <button
                  onClick={() => {
                    setCurrentJob(null)
                    setIsGenerating(false)
                  }}
                  className="btn-secondary"
                >
                  Start New Generation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
