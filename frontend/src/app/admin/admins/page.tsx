'use client'

import { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api'
import AddEditUserModal from './components/AddEditUserModal'
import UserDetailPanel from './components/UserDetailPanel'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import { UserCog } from 'lucide-react'

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  department: string
  is_active: boolean
}

interface PaginatedResponse<T> {
  results: T[]
  count: number
}

const COLUMNS: Column<Record<string, unknown>>[] = [
  { key: 'username', header: 'Username', width: '140px' },
  {
    key: 'first_name',
    header: 'Name',
    render: (_, row) => `${row['first_name'] || ''} ${row['last_name'] || ''}`.trim() || '—',
  },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', width: '120px', render: v => <span className="badge badge-neutral">{v as string}</span> },
  { key: 'department', header: 'Department', render: v => (v as string) || '—' },
  {
    key: 'is_active',
    header: 'Status',
    width: '80px',
    render: v => v
      ? <span className="badge badge-success">Active</span>
      : <span className="badge badge-neutral">Inactive</span>,
  },
]

export default function AdminUsersPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const itemsPerPage = 25

  const fetchUsers = useCallback(async (page = currentPage, search = searchTerm) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ role: 'ADMIN', page: String(page), page_size: String(itemsPerPage), ordering: 'username' })
      if (search) params.set('search', search)
      const response = await apiClient.request<PaginatedResponse<User>>(`/users/?${params}`)
      if (response.error) showToast('error', response.error)
      else if (response.data) {
        setUsers(response.data.results || [])
        setTotalCount(response.data.count ?? 0)
      }
    } catch { showToast('error', 'Failed to fetch admin users') }
    finally { setIsLoading(false) }
  }, [currentPage, searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setCurrentPage(1); fetchUsers(1, searchTerm) }, 400)
    return () => clearTimeout(t)
  }, [searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchUsers() }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveUser = async (userData: any) => {
    if (userData.role !== 'admin') { showToast('error', 'Only admin users can be created here'); return }
    const response = editingUser
      ? await apiClient.updateUser(String(editingUser.id), userData)
      : await apiClient.createUser(userData)
    if (response.error) { showToast('error', response.error); return }
    showToast('success', editingUser ? 'Admin updated' : 'Admin created')
    setShowModal(false)
    setEditingUser(null)
    await fetchUsers()
  }

  const handleBulkDelete = async (ids: string[]) => {
    const results = await Promise.all(ids.map(id => apiClient.deleteUser(id)))
    const firstError = results.find(r => r.error)
    if (firstError) { showToast('error', firstError.error!); return }
    showToast('success', `${ids.length} user${ids.length > 1 ? 's' : ''} deleted`)
    await fetchUsers()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage admin and staff accounts | Total: {totalCount} users
        </p>
        <button onClick={handleAddUser} className="btn-primary w-full sm:w-auto px-6 py-3">
          <span className="mr-2 text-lg">➕</span>
          Add Admin User
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Admin & Staff Users</h3>
          <p className="card-description">Administrative personnel only</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                placeholder="Search users..."
                className="input-primary pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <select
                className="input-primary w-full sm:w-32"
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                className="input-primary w-full sm:w-36"
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3 relative">
          {/* Mobile Loading Overlay */}
          {isTableLoading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            </div>
          )}

          {filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      #{(currentPage - 1) * 100 + index + 1}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                    {user.first_name} {user.last_name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'} ml-2`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="badge badge-neutral">{user.role}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.department || 'N/A'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="btn-ghost text-xs px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="btn-danger text-xs px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto relative">
          {/* Table Loading Overlay */}
          {isTableLoading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            </div>
          )}

          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">S.No</th>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">Role</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
        
            <tbody>
  {isLoading ? (
    <tr>
      <td colSpan="7">
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner w-6 h-6 mr-2"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Loading...
          </span>
        </div>
      </td>
    </tr>
  ) : (
    <div className="space-y-4">
      <PageHeader
        title="Admin Users"
        count={totalCount}
        loading={isLoading}
        primaryAction={{ label: 'Add Admin User', onClick: () => { setEditingUser(null); setShowModal(true) } }}
      />
      <DataTable
        columns={COLUMNS}
        data={users as unknown as Record<string, unknown>[]}
        loading={isLoading}
        totalCount={totalCount}
        page={currentPage}
        pageSize={itemsPerPage}
        onPageChange={setCurrentPage}
        selectable
        avatarColumn={row => {
          const u = row as unknown as User
          return (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.username
        }}
        onDelete={handleBulkDelete}
        onEdit={row => { setEditingUser(row as unknown as User); setShowModal(true) }}
        onRowClick={row => setDetailUser(row as unknown as User)}
        emptyState={{ icon: UserCog, title: 'No admin users found', description: 'Create an admin account to get started.' }}
      />
      <AddEditUserModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingUser(null) }}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </div>
  )
}