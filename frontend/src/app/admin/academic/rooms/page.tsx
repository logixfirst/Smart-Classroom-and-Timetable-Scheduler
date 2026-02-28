'use client'

import { useState, useEffect, useMemo } from 'react'
import apiClient from '@/lib/api'
import { TableSkeleton, TableRowsSkeleton } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'
import { useToast } from '@/components/Toast'

interface Room {
  room_id: string
  room_code: string
  room_number: string
  room_name?: string
  seating_capacity: number
  room_type: string
  building_name?: string
  building?: {
    building_id: string
    building_name: string
  }
  department?: {
    dept_id: string
    dept_name: string
  }
}

export default function ClassroomsPage() {
  const { showToast } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    room_code: '',
    room_number: '',
    room_name: '',
    seating_capacity: '',
    room_type: 'lecture_hall',
    building_id: '',
    dept_id: '',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounced server-side search — resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchRooms()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch on page / page-size change
  useEffect(() => {
    fetchRooms()
  }, [currentPage, itemsPerPage])

  const fetchRooms = async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getRooms(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        const data = response.data
        setRooms(data.results || data)
        setTotalCount(data.count || 0)
        if (data.count) setTotalPages(Math.ceil(data.count / itemsPerPage))
      }
    } catch {
      setError('Failed to load rooms')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = editingId
        ? await apiClient.updateRoom(editingId, formData)
        : await apiClient.createRoom(formData)

      if (response.error) {
        showToast('error', 'Failed to save room: ' + response.error)
      } else {
        showToast('success', editingId ? 'Room updated successfully' : 'Room created successfully')
        fetchRooms()
        resetForm()
      }
    } catch {
      showToast('error', 'Failed to save room')
    }
  }

  const handleEdit = (room: Room) => {
    setFormData({
      room_code: room.room_code,
      room_number: room.room_number,
      room_name: room.room_name || '',
      seating_capacity: room.seating_capacity.toString(),
      room_type: room.room_type,
      building_id: room.building?.building_id || '',
      dept_id: room.department?.dept_id || '',
    })
    setEditingId(room.room_id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room?')) return

    try {
      const response = await apiClient.deleteRoom(id)
      if (response.error) showToast('error', 'Failed to delete: ' + response.error)
      else { showToast('success', 'Room deleted'); fetchRooms() }
    } catch { showToast('error', 'Failed to delete room') }
  }

  const resetForm = () => {
    setFormData({ room_code: '', room_number: '', room_name: '', seating_capacity: '', room_type: 'lecture_hall', building_id: '', dept_id: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const ROOM_TYPE_LABELS: Record<string, string> = {
    lecture_hall: 'Lecture Hall',
    laboratory: 'Laboratory',
    tutorial_room: 'Tutorial Room',
    seminar_hall: 'Seminar Hall',
  }

  const filteredRooms = useMemo(() => {
    if (!selectedType) return rooms
    return rooms.filter(r => r.room_type === selectedType)
  }, [rooms, selectedType])



  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Rooms</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} rooms`}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Room
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit' : 'Add'} Room</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="room_code" className="block text-sm font-medium mb-2">Room Code</label>
                <input id="room_code" type="text" value={formData.room_code} onChange={e => setFormData({ ...formData, room_code: e.target.value })} className="input-primary" required />
              </div>
              <div>
                <label htmlFor="room_number" className="block text-sm font-medium mb-2">Room Number</label>
                <input id="room_number" type="text" value={formData.room_number} onChange={e => setFormData({ ...formData, room_number: e.target.value })} className="input-primary" required />
              </div>
              <div>
                <label htmlFor="room_name" className="block text-sm font-medium mb-2">Room Name</label>
                <input id="room_name" type="text" value={formData.room_name} onChange={e => setFormData({ ...formData, room_name: e.target.value })} className="input-primary" />
              </div>
              <div>
                <label htmlFor="seating_capacity" className="block text-sm font-medium mb-2">Capacity</label>
                <input id="seating_capacity" type="number" value={formData.seating_capacity} onChange={e => setFormData({ ...formData, seating_capacity: e.target.value })} className="input-primary" required />
              </div>
              <div>
                <label htmlFor="room_type" className="block text-sm font-medium mb-2">Type</label>
                <select id="room_type" value={formData.room_type} onChange={e => setFormData({ ...formData, room_type: e.target.value })} className="input-primary">
                  <option value="lecture_hall">Lecture Hall</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="tutorial_room">Tutorial Room</option>
                  <option value="seminar_hall">Seminar Hall</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button type="submit" className="btn-primary w-full sm:w-auto">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary w-full sm:w-auto">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
                placeholder="Search by room code, number, type, or department…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-primary pl-10 w-full"
              />
            </div>
            <select
              aria-label="Filter by room type"
              className="input-primary w-full sm:w-44"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(ROOM_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        {isLoading && <TableSkeleton rows={5} columns={7} />}

        {!isLoading && rooms.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No rooms found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {rooms.length === 0 ? 'No rooms have been added yet.' : 'Try adjusting your search.'}
            </p>
          </div>
        )}

        {!isLoading && filteredRooms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Code</th>
                <th className="table-header-cell">Number</th>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Building</th>
                <th className="table-header-cell">Capacity</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isTableLoading
                ? <TableRowsSkeleton rows={itemsPerPage} columns={7} />
                : filteredRooms.map(room => (
                <tr key={room.room_id} className="table-row">
                  <td className="table-cell font-medium">{room.room_code}</td>
                  <td className="table-cell">{room.room_number}</td>
                  <td className="table-cell">{room.room_name || '-'}</td>
                  <td className="table-cell">{room.building_name || room.building?.building_name || '-'}</td>
                  <td className="table-cell">{room.seating_capacity}</td>
                  <td className="table-cell"><span className="badge badge-neutral">{ROOM_TYPE_LABELS[room.room_type] || room.room_type}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(room)} className="btn-ghost text-xs px-2 py-1" disabled={isTableLoading}>Edit</button>
                      <button onClick={() => handleDelete(room.room_id)} className="btn-danger text-xs px-2 py-1" disabled={isTableLoading}>Delete</button>
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
    </div>
  )
}
