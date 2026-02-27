'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'
import AddEditSchoolModal from './components/AddEditSchoolModal'

interface School {
  id: number
  school_id: string
  school_code: string
  school_name: string
  description?: string
}

export default function SchoolsPage() {
  const { showToast } = useToast()
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounced server-side search — resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchSchools()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch on page / page-size change
  useEffect(() => {
    fetchSchools()
  }, [currentPage, itemsPerPage])

  const handleAdd = () => { setEditingSchool(null); setShowModal(true) }
  const handleEdit = (school: School) => { setEditingSchool(school); setShowModal(true) }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis action cannot be undone.`)) return
    setIsDeleting(id)
    try {
      const res = await apiClient.deleteSchool(String(id))
      if (res.error) showToast('error', res.error)
      else { showToast('success', `"${name}" deleted`); await fetchSchools() }
    } catch { showToast('error', 'Failed to delete school') }
    finally { setIsDeleting(null) }
  }

  const handleSave = async (data: any) => {
    const res = editingSchool
      ? await apiClient.updateSchool(String(editingSchool.id), data)
      : await apiClient.createSchool(data)
    if (res.error) { showToast('error', res.error); return }
    showToast('success', editingSchool ? 'School updated' : 'School created')
    setShowModal(false)
    await fetchSchools()
  }

  const fetchSchools = async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getSchools(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
        showToast('error', response.error)
      } else if (response.data) {
        const data = response.data
        setSchools(data.results || data)
        setTotalCount(data.count || 0)
        if (data.count) setTotalPages(Math.ceil(data.count / itemsPerPage))
      }
    } catch {
      showToast('error', 'Failed to load schools')
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Schools</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} schools`}
          </p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={handleAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add School
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
              placeholder="Search schools…"
              className="input-primary pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={4} />}

        {!isLoading && schools.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No schools found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {schools.length === 0 ? 'No schools have been added yet.' : 'Try adjusting your search.'}
            </p>
          </div>
        )}

        {!isLoading && schools.length > 0 && (
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
                {isTableLoading
                  ? <TableRowsSkeleton rows={itemsPerPage} columns={4} />
                  : schools.map(school => (
                  <tr key={school.id} className="table-row">
                    <td className="table-cell font-medium">{school.school_code}</td>
                    <td className="table-cell">{school.school_name}</td>
                    <td className="table-cell">{school.description || '-'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-ghost text-xs px-2 py-1"
                          onClick={() => handleEdit(school)}
                          disabled={isTableLoading || isDeleting !== null}
                        >Edit</button>
                        <button
                          className="btn-danger text-xs px-2 py-1"
                          onClick={() => handleDelete(school.id, school.school_name)}
                          disabled={isTableLoading || isDeleting === school.id}
                        >{isDeleting === school.id ? '…' : 'Delete'}</button>
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
      <AddEditSchoolModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        school={editingSchool}
        onSave={handleSave}
      />
    </div>
  )
}
