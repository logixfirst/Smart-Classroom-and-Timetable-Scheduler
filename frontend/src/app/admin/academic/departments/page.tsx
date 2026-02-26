'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'

interface Department {
  id: number
  dept_id: string
  dept_code: string
  dept_name: string
  school?: { school_name: string }
}

export default function DepartmentsPage() {
  const CACHE_KEY = 'departments_cache'
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const raw = sessionStorage.getItem('departments_cache')
      if (raw) { const { data, ts } = JSON.parse(raw); if (Date.now() - ts < 5 * 60 * 1000) return data }
    } catch { /* storage unavailable */ }
    return []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setIsLoading(true)
    try {
      const all: Department[] = []
      let page = 1
      while (true) {
        const response = await apiClient.getDepartments(page, 100)
        if (response.error) { showToast('error', response.error); break }
        if (!response.data) break
        const items: Department[] = Array.isArray(response.data) ? response.data : response.data.results || []
        all.push(...items)
        // Stop if this was the last page (no next page or got fewer than requested)
        const hasNext = !Array.isArray(response.data) && response.data.next
        if (!hasNext) break
        page++
      }
      setDepartments(all)
      try { sessionStorage.setItem('departments_cache', JSON.stringify({ data: all, ts: Date.now() })) } catch { /* quota exceeded */ }
    } catch (err) {
      showToast('error', 'Failed to load departments')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredDepartments = departments.filter(d =>
    searchTerm === '' ||
    d.dept_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.dept_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="card-title">Departments</h3>
              <p className="card-description">Total: {filteredDepartments.length} departments</p>
            </div>
            <button className="btn-primary w-full sm:w-auto">Add Department</button>
          </div>
          <div className="relative mt-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search departments..."
              className="input-primary pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={4} />}

        {!isLoading && filteredDepartments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {departments.length === 0 ? 'No departments found' : 'No departments match your search'}
            </p>
          </div>
        )}

        {!isLoading && filteredDepartments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">School</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map(dept => (
                  <tr key={dept.id} className="table-row">
                    <td className="table-cell">{dept.dept_code}</td>
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
