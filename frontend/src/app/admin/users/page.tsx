'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import apiClient from '@/lib/api'

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch users with debouncing for search
  useEffect(() => {
    // Reset to page 1 when search filters change
    if (searchTerm || selectedRole || selectedDepartment) {
      setCurrentPage(1)
    }

    const timer = setTimeout(() => {
      fetchUsers()
    }, searchTerm ? 500 : 0) // Debounce only for text search, instant for dropdowns

    return () => clearTimeout(timer)
  }, [searchTerm, selectedRole, selectedDepartment, currentPage])

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Build query params for backend filtering
      let url = `/users/?page=${currentPage}`
      if (selectedRole) url += `&role=${selectedRole}`
      if (selectedDepartment) url += `&department=${selectedDepartment}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`
      
      const response = await apiClient.request<PaginatedResponse<User>>(url)
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setUsers(response.data.results || [])
        setTotalCount(response.data.count || 0)
        if (response.data.count) {
          setTotalPages(Math.ceil(response.data.count / 100))
        }
      }
    } catch (err) {
      setError('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  // No client-side filtering - backend does it
  const filteredUsers = users

  // Get unique departments and roles from current page
  const departments = [...new Set(users.map(u => u.department))].filter(Boolean)
  const roles = ['admin', 'staff', 'faculty', 'student'] // Fixed roles

  if (error) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">User Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {totalCount} users | Page {currentPage} of {totalPages}
            </p>
          </div>
          <button className="btn-primary w-full sm:w-auto px-6 py-3">
            <span className="mr-2 text-lg">➕</span>
            Add User
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  placeholder="Search users..." 
                  className="input-primary pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <select 
                  className="input-primary w-full sm:w-32"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  aria-label="Filter by role"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select 
                  className="input-primary w-full sm:w-36"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  aria-label="Filter by department"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner w-6 h-6 mr-2"></div>
              <span className="text-gray-600 dark:text-gray-400">Loading users...</span>
            </div>
          )}
          
          {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {filteredUsers.map((user) => (
              <div key={user.id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">{user.department}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                    <button className="btn-danger text-xs px-2 py-1">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">{user.email}</div>
                    </td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">
                      <span className="badge badge-neutral text-xs">{user.role}</span>
                    </td>
                    <td className="table-cell">{user.department}</td>
                    <td className="table-cell">
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'} text-xs`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 sm:gap-2">
                        <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                        <button className="btn-danger text-xs px-2 py-1">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-[#3c4043]">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
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
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm ${
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
                        <button onClick={() => setCurrentPage(1)} className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-[#3c4043]">1</button>
                        <span className="px-2">...</span>
                      </>
                    )}
                    {Array.from({ length: 5 }, (_, i) => {
                      const page = currentPage - 2 + i
                      if (page < 1 || page > totalPages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm ${
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
                        <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-[#3c4043]">{totalPages}</button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}