'use client'

import { useState, useEffect, useMemo } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'
import AddEditDepartmentModal from './components/AddEditDepartmentModal'

interface Department {
  id: number
  dept_id: string
  dept_code: string
  dept_name: string
  school?: { id?: number; school_name: string }
}

export default function DepartmentsPage() {
  const { showToast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounced server-side search — resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchDepartments()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch on page / page-size change
  useEffect(() => {
    fetchDepartments()
  }, [currentPage, itemsPerPage])

  const schoolOptions = useMemo(() => {
    const names = departments.map(d => d.school?.school_name).filter(Boolean) as string[]
    return [...new Set(names)].sort()
  }, [departments])

  const filteredDepartments = useMemo(() => {
    if (!selectedSchool) return departments
    return departments.filter(d => d.school?.school_name === selectedSchool)
  }, [departments, selectedSchool])

  const handleAdd = () => { setEditingDept(null); setShowModal(true) }
  const handleEdit = (dept: Department) => { setEditingDept(dept); setShowModal(true) }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis action cannot be undone.`)) return
    setIsDeleting(id)
    try {
      const res = await apiClient.deleteDepartment(String(id))
      if (res.error) showToast('error', res.error)
      else { showToast('success', `"${name}" deleted`); await fetchDepartments() }
    } catch { showToast('error', 'Failed to delete department') }
    finally { setIsDeleting(null) }
  }

  const handleSave = async (data: any) => {
    const res = editingDept
      ? await apiClient.updateDepartment(String(editingDept.id), data)
      : await apiClient.createDepartment(data)
    if (res.error) { showToast('error', res.error); return }
    showToast('success', editingDept ? 'Department updated' : 'Department created')
    setShowModal(false)
    await fetchDepartments()
  }

  const fetchDepartments = async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getDepartments(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
        showToast('error', response.error)
      } else if (response.data) {
        const data = response.data
        setDepartments(data.results || data)
        setTotalCount(data.count || 0)
        if (data.count) setTotalPages(Math.ceil(data.count / itemsPerPage))
      }
    } catch {
      showToast('error', 'Failed to load departments')
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Departments</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} departments`}
          </p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={handleAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Department
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search departments…"
                className="input-primary pl-10 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter by school"
              className="input-primary w-full sm:w-44"
              value={selectedSchool}
              onChange={e => setSelectedSchool(e.target.value)}
            >
              <option value="">All Schools</option>
              {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={4} />}

        {!isLoading && filteredDepartments.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No departments found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {departments.length === 0 ? 'No departments have been added yet.' : 'Try adjusting your search.'}
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
                {isTableLoading
                  ? <TableRowsSkeleton rows={itemsPerPage} columns={4} />
                  : filteredDepartments.map(dept => (
                  <tr key={dept.id} className="table-row">
                    <td className="table-cell font-medium">{dept.dept_code}</td>
                    <td className="table-cell">{dept.dept_name}</td>
                    <td className="table-cell">{dept.school?.school_name || '-'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-ghost text-xs px-2 py-1"
                          onClick={() => handleEdit(dept)}
                          disabled={isTableLoading || isDeleting !== null}
                        >Edit</button>
                        <button
                          className="btn-danger text-xs px-2 py-1"
                          onClick={() => handleDelete(dept.id, dept.dept_name)}
                          disabled={isTableLoading || isDeleting === dept.id}
                        >{isDeleting === dept.id ? '…' : 'Delete'}</button>
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
      <AddEditDepartmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        department={editingDept}
        onSave={handleSave}
      />
    </div>
  )
}
