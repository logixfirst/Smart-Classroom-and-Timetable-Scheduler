'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import AddEditUserModal from './components/AddEditUserModal'
import { useToast } from '@/components/Toast'

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

  // Fetch users with debouncing for search - ONLY admin and staff roles
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
    if (isPageChange || searchTerm || selectedRole || selectedDepartment || currentPage > 1) {
      setIsTableLoading(true)
    } else {
      setIsLoading(true)
    }

    setError(null)
    try {
      // Build query params - Fetch all users with large page size, ordered by role
      let url = `/users/?page=1&page_size=10000&ordering=role&_t=${Date.now()}`

      // Note: Backend doesn't support role filtering, so we filter client-side below
      // if (selectedRole) url += `&role=${selectedRole}`
      if (selectedDepartment) url += `&department=${selectedDepartment}`

      // Add search term if provided (for username, email, first_name, last_name)
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`
      }

      console.log('Fetching users from:', url)
      const response = await apiClient.request<PaginatedResponse<User>>(url)
      console.log('API Response:', response)

      if (response.error) {
        console.error('API Error:', response.error)
        setError(response.error)
      } else if (response.data) {
        // Filter to show only administrative users (client-side filtering)
        const allUsers = response.data.results || []
        
        console.log('Total users fetched:', allUsers.length)
        console.log('User roles:', allUsers.map(u => ({ username: u.username, role: u.role })))

        let adminUsers = allUsers.filter(
          u => {
            const role = u.role?.toUpperCase()
            // Only show ADMIN and STAFF roles (database constraint values)
            return role === 'ADMIN' || role === 'STAFF'
          }
        )
        
        console.log('Admin users after filter:', adminUsers.length, adminUsers.map(u => ({ username: u.username, role: u.role })))

        // Apply role filter if selected
        if (selectedRole) {
          adminUsers = adminUsers.filter(u => u.role?.toUpperCase() === selectedRole.toUpperCase())
        }

        setUsers(adminUsers)
        setTotalCount(adminUsers.length)
        setTotalPages(Math.ceil(adminUsers.length / 100))
      } else {
        console.warn('No data in response')
        setUsers([])
        setTotalCount(0)
        setTotalPages(0)
      }
    } catch (err) {
      console.error('Exception fetching users:', err)
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
  const roles = ['admin', 'org_admin', 'super_admin', 'staff'] // Administrative roles only

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
      // Validate that role is admin or staff
      if (userData.role !== 'admin' && userData.role !== 'staff') {
        showToast('error', 'Only admin and staff users can be created on this page')
        return
      }

      let response
      if (editingUser) {
        response = await apiClient.updateUser(editingUser.id.toString(), userData)
      } else {
        // Create admin/staff user
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
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => fetchUsers()} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    )
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
    filteredUsers.map((user, index) => (
      <tr key={user.id} className="table-row">
        <td className="table-cell">
          <div className="font-medium text-gray-800 dark:text-gray-200">
            {(currentPage - 1) * 100 + index + 1}
          </div>
        </td>

        <td className="table-cell">
          <div className="font-medium text-gray-800 dark:text-gray-200">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
            {user.email}
          </div>
        </td>

        <td className="table-cell">{user.email}</td>

        <td className="table-cell">
          <span className="badge badge-neutral text-xs">{user.role}</span>
        </td>

        <td className="table-cell">{user.department || 'N/A'}</td>

        <td className="table-cell">
          <span
            className={`badge ${
              user.is_active ? 'badge-success' : 'badge-error'
            } text-xs`}
          >
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>

        <td className="table-cell">
          <div className="flex gap-1 sm:gap-2">
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
              Del
            </button>
          </div>
        </td>
      </tr>
    ))
  )}
</tbody>
 </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-[#3c4043]">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isTableLoading}
              className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTableLoading && currentPage > 1 ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading...
                </div>
              ) : (
                '← Previous'
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              {totalPages <= 10 ? (
                // Show all pages if 10 or less
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isTableLoading}
                      className={`px-3 py-1 rounded text-sm disabled:opacity-50 ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4c5053]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              ) : (
                // Show limited pages with ellipsis
                <div className="flex gap-1">
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={isTableLoading}
                        className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-[#3c4043] disabled:opacity-50"
                      >
                        1
                      </button>
                      <span className="px-2">...</span>
                    </>
                  )}
                  {Array.from({ length: 5 }, (_, i) => {
                    const page = currentPage - 2 + i
                    if (page < 1 || page > totalPages) return null
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isTableLoading}
                        className={`px-3 py-1 rounded text-sm disabled:opacity-50 ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  {currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={isTableLoading}
                        className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-[#3c4043] disabled:opacity-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isTableLoading}
              className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTableLoading && currentPage < totalPages ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading...
                </div>
              ) : (
                'Next →'
              )}
            </button>
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
