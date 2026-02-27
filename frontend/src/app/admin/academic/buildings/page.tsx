'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'

interface Building {
  id: number
  building_id: string
  building_code: string
  building_name: string
  address?: string
  total_floors?: number
}

export default function BuildingsPage() {
  const { showToast } = useToast()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounced server-side search — resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchBuildings()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch on page / page-size change
  useEffect(() => {
    fetchBuildings()
  }, [currentPage, itemsPerPage])

  const fetchBuildings = async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getBuildings(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
        showToast('error', response.error)
      } else if (response.data) {
        const data = response.data
        setBuildings(data.results || data)
        setTotalCount(data.count || 0)
        if (data.count) setTotalPages(Math.ceil(data.count / itemsPerPage))
      }
    } catch {
      showToast('error', 'Failed to load buildings')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="card-title">Buildings</h3>
              <p className="card-description">Total: {totalCount} buildings</p>
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

        {!isLoading && buildings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No buildings found</p>
          </div>
        )}

        {!isLoading && buildings.length > 0 && (
          <div className="overflow-x-auto relative">
            {isTableLoading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                <TableSkeleton rows={3} columns={5} />
              </div>
            )}
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
                {buildings.map(building => (
                  <tr key={building.id} className="table-row">
                    <td className="table-cell">{building.building_code}</td>
                    <td className="table-cell">{building.building_name}</td>
                    <td className="table-cell">{building.address || '-'}</td>
                    <td className="table-cell">{building.total_floors || '-'}</td>
                    <td className="table-cell">
                      <button className="btn-ghost text-xs px-2 py-1" disabled={isTableLoading}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showItemsPerPage={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
