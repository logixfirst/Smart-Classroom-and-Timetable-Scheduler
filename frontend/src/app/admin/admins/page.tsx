'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/Pagination'
import apiClient from '@/lib/api'
import AddEditUserModal from './components/AddEditUserModal'
import { useToast } from '@/components/Toast'
import { TableSkeleton } from '@/components/LoadingSkeletons'

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
  next?: string
  previous?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const { showToast } = useToast()

  // Fetch users with debouncing for search - ONLY admin roles
  useEffect(() => {
    // Reset to page 1 when search filters change
    if (searchTerm || selectedRole || selectedDepartment) {
      setCurrentPage(1)
    }

    const timer = setTimeout(
      () => {
        fetchUsers()
      },
      searchTerm ? 500 : 0
    )

    return () => clearTimeout(timer)
  }, [searchTerm, selectedRole, selectedDepartment, currentPage])

  const fetchUsers = async (isPageChange = false) => {
    if (currentPage > 1 || isPageChange || searchTerm || selectedDepartment) {
      setIsTableLoading(true)
    } else {
      setIsLoading(true)
    }

    setError(null)
    try {
      // Always filter to ADMIN role server-side — no more 10 000-row dump
      const params = new URLSearchParams({
        role: 'ADMIN',
        page: currentPage.toString(),
        page_size: '100',
        ordering: 'username',
      })
      if (searchTerm) params.set('search', searchTerm)
      if (selectedDepartment) params.set('department', selectedDepartment)

      const response = await apiClient.request<PaginatedResponse<User>>(`/users/?${params}`)

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        let results = response.data.results || []
        // Secondary in-page filter when a specific role sub-type is selected
        if (selectedRole) {
          results = results.filter(u => u.role?.toUpperCase() === selectedRole.toUpperCase())
        }
        setUsers(results)
        const count = response.data.count ?? results.length
        setTotalCount(count)
        setTotalPages(Math.max(1, Math.ceil(count / 100)))
      } else {
        setUsers([])
        setTotalCount(0)
        setTotalPages(0)
      }
    } catch (err) {
      setError('Failed to fetch admin users')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }

  // No client-side filtering - backend does it
  const filteredUsers = users

  // Get unique departments and roles from current page
  const departments = [...new Set(users.map(u => u.department))].filter(Boolean)
  const roles = ['admin', 'org_admin', 'super_admin'] // Administrative roles only

  // Pagination handlers with table loading
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setShowModal(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await apiClient.deleteUser(userId.toString())
      if (response.error) {
        showToast('error', response.error)
      } else {
        showToast('success', 'User deleted successfully')

        // Force immediate refresh with cache bypass
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchUsers()
      }
    } catch (error) {
      showToast('error', 'Failed to delete user')
    }
  }

  const handleSaveUser = async (userData: any) => {
    try {
      // Validate that role is admin
      if (userData.role !== 'admin') {
        showToast('error', 'Only admin users can be created on this page')
        return
      }

      let response
      if (editingUser) {
        response = await apiClient.updateUser(editingUser.id.toString(), userData)
      } else {
        // Create admin user
        response = await apiClient.createUser(userData)
      }

      if (response.error) {
        showToast('error', response.error)
      } else {
        showToast(
          'success',
          editingUser ? 'Admin user updated successfully' : 'Admin user created successfully'
        )
        setShowModal(false)
        setEditingUser(null)

        // Force immediate refresh
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchUsers()
      }
    } catch (error) {
      showToast('error', 'Failed to save admin user')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button onClick={() => fetchUsers()} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isLoading ? 'Loading…' : `${totalCount.toLocaleString()} admin accounts`}
          </p>
        </div>
        <button onClick={handleAddUser} className="btn-primary w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Admin User
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Admin Users</h3>
          <p className="card-description">Administrative personnel only</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
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

        

        {isLoading && <TableSkeleton rows={5} columns={7} />}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No admin users found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {users.length === 0 ? 'No admin accounts have been created yet.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}

        {/* Mobile Card View */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="block lg:hidden space-y-3 relative">
            {isTableLoading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                <TableSkeleton rows={3} columns={7} />
              </div>
            )}
            {filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="interactive-element p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user.department || 'No department'}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEditUser(user)} className="btn-ghost text-xs px-2 py-1">Edit</button>
                    <button onClick={() => handleDeleteUser(user.id)} className="btn-danger text-xs px-2 py-1">Delete</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="badge badge-neutral text-xs">{user.role}</span>
                  <span className={`badge text-xs ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop Table View */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="hidden lg:block overflow-x-auto relative">
            {isTableLoading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                <TableSkeleton rows={3} columns={7} />
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
                {filteredUsers.map((user, index) => (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {(currentPage - 1) * 100 + index + 1}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{user.username}</div>
                    </td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">
                      <span className="badge badge-neutral text-xs">{user.role}</span>
                    </td>
                    <td className="table-cell">{user.department || <span className="text-gray-400">N/A</span>}</td>
                    <td className="table-cell">
                      <span className={`badge text-xs ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => handleEditUser(user)} className="btn-ghost text-xs px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="btn-danger text-xs px-2 py-1">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              itemsPerPage={100}
              onPageChange={handlePageChange}
              onItemsPerPageChange={() => {}}
              showItemsPerPage={false}
            />
          </div>
        )}
      </div>

      <AddEditUserModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingUser(null)
        }}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </div>
  )
}
