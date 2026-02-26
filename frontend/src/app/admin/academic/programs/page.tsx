'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'
import { useToast } from '@/components/Toast'

interface Program {
  id: number
  program_id: string
  program_name: string
  department?: { dept_name: string }
  duration_years?: number
}

interface ProgramsResponse {
  results?: Program[]
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.request<Program[] | ProgramsResponse>('/programs/')
      if (response.error) {
        showToast('error', response.error)
      } else if (response.data) {
        setPrograms(Array.isArray(response.data) ? response.data : (response.data as ProgramsResponse).results || [])
      }
    } catch (err) {
      showToast('error', 'Failed to load programs')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Total: {programs.length} programs</p>
        <button className="btn-primary">Add Program</button>
      </div>

      <div className="card">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <GoogleSpinner size={48} className="mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading programs...</p>
          </div>
        )}

        {!isLoading && programs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No programs found</p>
          </div>
        )}

        {!isLoading && programs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Program ID</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Duration</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {programs.map(program => (
                  <tr key={program.id} className="table-row">
                    <td className="table-cell">{program.program_id}</td>
                    <td className="table-cell">{program.program_name}</td>
                    <td className="table-cell">{program.department?.dept_name || '-'}</td>
                    <td className="table-cell">{program.duration_years ? `${program.duration_years} years` : '-'}</td>
                    <td className="table-cell">
                      <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
