'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'

interface Building {
  id: number
  building_id: string
  building_code: string
  building_name: string
  address?: string
  total_floors?: number
}

interface BuildingsResponse {
  results?: Building[]
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>(() => {
    try {
      const raw = sessionStorage.getItem('buildings_cache')
      if (raw) { const { data, ts } = JSON.parse(raw); if (Date.now() - ts < 5 * 60 * 1000) return data }
    } catch { /* storage unavailable */ }
    return []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    setIsLoading(true)
    try {
      const all: Building[] = []
      let page = 1
      while (true) {
        const response = await apiClient.request<Building[] | BuildingsResponse>(`/buildings/?page=${page}&page_size=100`)
        if (response.error) { showToast('error', response.error); break }
        if (!response.data) break
        const items: Building[] = Array.isArray(response.data) ? response.data : (response.data as BuildingsResponse).results || []
        all.push(...items)
        const hasNext = !Array.isArray(response.data) && (response.data as any).next
        if (!hasNext) break
        page++
      }
      setBuildings(all)
      try { sessionStorage.setItem('buildings_cache', JSON.stringify({ data: all, ts: Date.now() })) } catch { /* quota exceeded */ }
    } catch (err) {
      showToast('error', 'Failed to load buildings')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBuildings = buildings.filter(b =>
    searchTerm === '' ||
    b.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.building_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="card-title">Buildings</h3>
              <p className="card-description">Total: {filteredBuildings.length} buildings</p>
            </div>
            <button className="btn-primary w-full sm:w-auto">Add Building</button>
          </div>
          <div className="relative mt-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search buildings..."
              className="input-primary pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={5} />}

        {!isLoading && filteredBuildings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {buildings.length === 0 ? 'No buildings found' : 'No buildings match your search'}
            </p>
          </div>
        )}

        {!isLoading && filteredBuildings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Address</th>
                  <th className="table-header-cell">Floors</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuildings.map(building => (
                  <tr key={building.id} className="table-row">
                    <td className="table-cell">{building.building_code}</td>
                    <td className="table-cell">{building.building_name}</td>
                    <td className="table-cell">{building.address || '-'}</td>
                    <td className="table-cell">{building.total_floors || '-'}</td>
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
