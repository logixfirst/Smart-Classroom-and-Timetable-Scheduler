'use client'

import { useState, useEffect, useMemo } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'
import AddEditProgramModal from './components/AddEditProgramModal'

interface Program {
  id: number
  program_id: string
  program_code: string
  program_name: string
  department?: { id?: number; dept_name: string }
  duration_years?: number
}

export default function ProgramsPage() {
  const { showToast } = useToast()
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounced server-side search — resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchPrograms()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch on page / page-size change
  useEffect(() => {
    fetchPrograms()
  }, [currentPage, itemsPerPage])

  const deptOptions = useMemo(() => {
    const names = programs.map(p => p.department?.dept_name).filter(Boolean) as string[]
    return [...new Set(names)].sort()
  }, [programs])

  const filteredPrograms = useMemo(() => {
    if (!selectedDept) return programs
    return programs.filter(p => p.department?.dept_name === selectedDept)
  }, [programs, selectedDept])

  const handleAdd = () => { setEditingProgram(null); setShowModal(true) }
  const handleEdit = (prog: Program) => { setEditingProgram(prog); setShowModal(true) }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis action cannot be undone.`)) return
    setIsDeleting(id)
    try {
      const res = await apiClient.deleteProgram(String(id))
      if (res.error) showToast('error', res.error)
      else { showToast('success', `"${name}" deleted`); await fetchPrograms() }
    } catch { showToast('error', 'Failed to delete program') }
    finally { setIsDeleting(null) }
  }

  const handleSave = async (data: any) => {
    const res = editingProgram
      ? await apiClient.updateProgram(String(editingProgram.id), data)
      : await apiClient.createProgram(data)
    if (res.error) { showToast('error', res.error); return }
    showToast('success', editingProgram ? 'Program updated' : 'Program created')
    setShowModal(false)
    await fetchPrograms()
  }

  const fetchPrograms = async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getPrograms(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
        showToast('error', response.error)
      } else if (response.data) {
        const data = response.data
        setPrograms(data.results || data)
        setTotalCount(data.count || 0)
        if (data.count) setTotalPages(Math.ceil(data.count / itemsPerPage))
      }
    } catch {
      showToast('error', 'Failed to load programs')
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Programs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} programs`}
          </p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={handleAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Program
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
                placeholder="Search programs…"
                className="input-primary pl-10 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter by department"
              className="input-primary w-full sm:w-48"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {isLoading && <TableSkeleton rows={5} columns={5} />}

        {!isLoading && filteredPrograms.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No programs found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {programs.length === 0 ? 'No programs have been added yet.' : 'Try adjusting your search.'}
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
                {isTableLoading
                  ? <TableRowsSkeleton rows={itemsPerPage} columns={5} />
                  : filteredPrograms.map(program => (
                  <tr key={program.id} className="table-row">
                    <td className="table-cell font-medium">{program.program_code}</td>
                    <td className="table-cell">{program.program_name}</td>
                    <td className="table-cell">{program.department?.dept_name || '-'}</td>
                    <td className="table-cell">{program.duration_years ? `${program.duration_years} yrs` : '-'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-ghost text-xs px-2 py-1"
                          onClick={() => handleEdit(program)}
                          disabled={isTableLoading || isDeleting !== null}
                        >Edit</button>
                        <button
                          className="btn-danger text-xs px-2 py-1"
                          onClick={() => handleDelete(program.id, program.program_name)}
                          disabled={isTableLoading || isDeleting === program.id}
                        >{isDeleting === program.id ? '…' : 'Delete'}</button>
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
      <AddEditProgramModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        program={editingProgram}
        onSave={handleSave}
      />
    </div>
  )
}
