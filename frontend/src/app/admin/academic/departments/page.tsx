'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

interface Department {
  id: number
  dept_id: string
  dept_name: string
  school?: { school_name: string }
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getDepartments()
      if (response.error) {
        showToast('error', response.error)
      } else if (response.data) {
        setDepartments(Array.isArray(response.data) ? response.data : response.data.results || [])
      }
    } catch (err) {
      showToast('error', 'Failed to load departments')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Total: {departments.length} departments</p>
        <button className="btn-primary">Add Department</button>
      </div>

      <div className="card">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <GoogleSpinner size={48} className="mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading departments...</p>
          </div>
        )}

        {!isLoading && departments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No departments found</p>
          </div>
        )}

        {!isLoading && departments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Dept ID</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">School</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id} className="table-row">
                    <td className="table-cell">{dept.dept_id}</td>
                    <td className="table-cell">{dept.dept_name}</td>
                    <td className="table-cell">{dept.school?.school_name || '-'}</td>
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
