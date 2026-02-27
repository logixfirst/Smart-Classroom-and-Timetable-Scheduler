'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'
import AddEditBuildingModal from './components/AddEditBuildingModal'

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

  const [showModal, setShowModal] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

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

  const handleAdd = () => { setEditingBuilding(null); setShowModal(true) }
  const handleEdit = (b: Building) => { setEditingBuilding(b); setShowModal(true) }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis action cannot be undone.`)) return
    setIsDeleting(id)
    try {
      const res = await apiClient.deleteBuilding(String(id))
      if (res.error) showToast('error', res.error)
      else { showToast('success', `"${name}" deleted`); await fetchBuildings() }
    } catch { showToast('error', 'Failed to delete building') }
    finally { setIsDeleting(null) }
  }

  const handleSave = async (data: any) => {
    const res = editingBuilding
      ? await apiClient.updateBuilding(String(editingBuilding.id), data)
      : await apiClient.createBuilding(data)
    if (res.error) { showToast('error', res.error); return }
    showToast('success', editingBuilding ? 'Building updated' : 'Building created')
    setShowModal(false)
    await fetchBuildings()
  }

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
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Buildings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} buildings`}
          </p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={handleAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Building
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search buildings…"
              className="input-primary pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={5} />}

        {!isLoading && buildings.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No buildings found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {buildings.length === 0 ? 'No buildings have been added yet.' : 'Try adjusting your search.'}
            </p>
          </div>
        )}

        {!isLoading && buildings.length > 0 && (
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
                {isTableLoading
                  ? <TableRowsSkeleton rows={itemsPerPage} columns={5} />
                  : buildings.map(building => (
                  <tr key={building.id} className="table-row">
                    <td className="table-cell font-medium">{building.building_code}</td>
                    <td className="table-cell">{building.building_name}</td>
                    <td className="table-cell">{building.address || '-'}</td>
                    <td className="table-cell">{building.total_floors || '-'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-ghost text-xs px-2 py-1"
                          onClick={() => handleEdit(building)}
                          disabled={isTableLoading || isDeleting !== null}
                        >Edit</button>
                        <button
                          className="btn-danger text-xs px-2 py-1"
                          onClick={() => handleDelete(building.id, building.building_name)}
                          disabled={isTableLoading || isDeleting === building.id}
                        >{isDeleting === building.id ? '…' : 'Delete'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
      <AddEditBuildingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        building={editingBuilding}
        onSave={handleSave}
      />
    </div>
  )
}
