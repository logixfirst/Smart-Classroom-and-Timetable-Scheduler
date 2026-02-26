'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'

interface Program {
  id: number
  program_id: string
  program_code: string
  program_name: string
  department?: { dept_name: string }
  duration_years?: number
}

interface ProgramsResponse {
  results?: Program[]
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>(() => {
    try {
      const raw = sessionStorage.getItem('programs_cache')
      if (raw) { const { data, ts } = JSON.parse(raw); if (Date.now() - ts < 5 * 60 * 1000) return data }
    } catch { /* storage unavailable */ }
    return []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    setIsLoading(true)
    try {
      const all: Program[] = []
      let page = 1
      while (true) {
        const response = await apiClient.request<Program[] | ProgramsResponse>(`/programs/?page=${page}&page_size=100`)
        if (response.error) { showToast('error', response.error); break }
        if (!response.data) break
        const items: Program[] = Array.isArray(response.data) ? response.data : (response.data as ProgramsResponse).results || []
        all.push(...items)
        const hasNext = !Array.isArray(response.data) && (response.data as any).next
        if (!hasNext) break
        page++
      }
      setPrograms(all)
      try { sessionStorage.setItem('programs_cache', JSON.stringify({ data: all, ts: Date.now() })) } catch { /* quota exceeded */ }
    } catch (err) {
      showToast('error', 'Failed to load programs')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPrograms = programs.filter(p =>
    searchTerm === '' ||
    p.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.program_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.department?.dept_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="card-title">Programs</h3>
              <p className="card-description">Total: {filteredPrograms.length} programs</p>
            </div>
            <button className="btn-primary w-full sm:w-auto">Add Program</button>
          </div>
          <div className="relative mt-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search programs..."
              className="input-primary pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={5} />}

        {!isLoading && filteredPrograms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {programs.length === 0 ? 'No programs found' : 'No programs match your search'}
            </p>
          </div>
        )}

        {!isLoading && filteredPrograms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Duration</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrograms.map(program => (
                  <tr key={program.id} className="table-row">
                    <td className="table-cell">{program.program_code}</td>
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
