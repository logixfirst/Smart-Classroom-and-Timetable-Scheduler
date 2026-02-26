'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'

interface School {
  id: number
  school_id: string
  school_code: string
  school_name: string
  description?: string
}

interface SchoolsResponse {
  results?: School[]
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>(() => {
    try {
      const raw = sessionStorage.getItem('schools_cache')
      if (raw) { const { data, ts } = JSON.parse(raw); if (Date.now() - ts < 5 * 60 * 1000) return data }
    } catch { /* storage unavailable */ }
    return []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    setIsLoading(true)
    try {
      const all: School[] = []
      let page = 1
      while (true) {
        const response = await apiClient.request<School[] | SchoolsResponse>(`/schools/?page=${page}&page_size=100`)
        if (response.error) { showToast('error', response.error); break }
        if (!response.data) break
        const items: School[] = Array.isArray(response.data) ? response.data : (response.data as SchoolsResponse).results || []
        all.push(...items)
        const hasNext = !Array.isArray(response.data) && (response.data as any).next
        if (!hasNext) break
        page++
      }
      setSchools(all)
      try { sessionStorage.setItem('schools_cache', JSON.stringify({ data: all, ts: Date.now() })) } catch { /* quota exceeded */ }
    } catch (err) {
      showToast('error', 'Failed to load schools')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSchools = schools.filter(s =>
    searchTerm === '' ||
    s.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.school_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="card-title">Schools</h3>
              <p className="card-description">Total: {filteredSchools.length} schools</p>
            </div>
            <button className="btn-primary w-full sm:w-auto">Add School</button>
          </div>
          <div className="relative mt-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search schools..."
              className="input-primary pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={4} />}

        {!isLoading && filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {schools.length === 0 ? 'No schools found' : 'No schools match your search'}
            </p>
          </div>
        )}

        {!isLoading && filteredSchools.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Description</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map(school => (
                  <tr key={school.id} className="table-row">
                    <td className="table-cell">{school.school_code}</td>
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
