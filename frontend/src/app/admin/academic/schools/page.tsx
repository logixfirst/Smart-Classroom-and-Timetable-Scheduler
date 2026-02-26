'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

interface School {
  id: number
  school_id: string
  school_name: string
  description?: string
}

interface SchoolsResponse {
  results?: School[]
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.request<School[] | SchoolsResponse>('/schools/')
      if (response.error) {
        showToast('error', response.error)
      } else if (response.data) {
        setSchools(Array.isArray(response.data) ? response.data : (response.data as SchoolsResponse).results || [])
      }
    } catch (err) {
      showToast('error', 'Failed to load schools')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Total: {schools.length} schools</p>
        <button className="btn-primary">Add School</button>
      </div>

      <div className="card">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <GoogleSpinner size={48} className="mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading schools...</p>
          </div>
        )}

        {!isLoading && schools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No schools found</p>
          </div>
        )}

        {!isLoading && schools.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">School ID</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Description</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(school => (
                  <tr key={school.id} className="table-row">
                    <td className="table-cell">{school.school_id}</td>
                    <td className="table-cell">{school.school_name}</td>
                    <td className="table-cell">{school.description || '-'}</td>
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
