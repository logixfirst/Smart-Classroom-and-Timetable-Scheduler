'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { useToast } from '@/components/Toast'
import apiClient from '@/lib/api'

export default function AdminDashboard() {
  const router = useRouter()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCourses: 0,
    pendingApprovals: 0,
    systemHealth: 98
  })
  const [loading, setLoading] = useState(true)
  const [faculty, setFaculty] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Add cache buster to force fresh data
      const timestamp = Date.now()
      const [usersRes, studentsRes, facultyRes, coursesRes] = await Promise.all([
        apiClient.request(`/users/?_t=${timestamp}`),
        apiClient.request(`/students/?_t=${timestamp}`),
        apiClient.request(`/faculty/?_t=${timestamp}`),
        apiClient.request(`/courses/?_t=${timestamp}`)
      ])

      // Calculate total users: Admin/Staff from users table + Faculty + Students
      const usersData = (usersRes.data as any)
      const allUsers = usersData?.results || []
      const adminStaffCount = allUsers.filter((u: any) => u.role === 'admin' || u.role === 'staff').length
      
      const totalFaculty = (facultyRes.data as any)?.count || (facultyRes.data as any)?.results?.length || 0
      const totalStudents = (studentsRes.data as any)?.count || (studentsRes.data as any)?.results?.length || 0
      
      // Total users = Admin/Staff + Faculty + Students (no duplicates)
      const totalUsers = adminStaffCount + totalFaculty + totalStudents
      
      const activeCourses = (coursesRes.data as any)?.length || (coursesRes.data as any)?.results?.length || 0
      
      setStats({
        totalUsers,
        activeCourses,
        pendingApprovals: 0,
        systemHealth: 98
      })
      
      console.log('Dashboard updated:', { totalUsers, adminStaffCount, totalFaculty, totalStudents, activeCourses })

      const facultyData = (facultyRes.data as any)?.results || facultyRes.data || []
      setFaculty(facultyData.slice(0, 3).map((f: any) => ({
        id: f.faculty_id || f.id,
        name: f.faculty_name || f.name || 'Unknown',
        department: f.department?.department_name || f.department || 'N/A',
        isAvailable: true
      })))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStrategicAction = async (action: string) => {
    setIsLoading(true)
    
    try {
      switch (action) {
        case 'addUser':
          router.push('/admin/users')
          break
        case 'roles':
          showToast('info', 'Role management feature coming soon')
          break
        case 'audit':
          router.push('/admin/logs')
          break
        case 'config':
          router.push('/admin/settings')
          break
        case 'backup':
          await simulateBackup()
          break
        case 'reports':
          await generateReports()
          break
        default:
          showToast('warning', 'Feature not implemented yet')
      }
    } catch (error) {
      showToast('error', 'Action failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const simulateBackup = async () => {
    showToast('info', 'Starting database backup...')
    
    // Simulate backup process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    showToast('success', 'Database backup completed successfully!')
  }

  const generateReports = async () => {
    showToast('info', 'Generating system reports...')
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    showToast('success', 'Reports generated and ready for download!')
  }

  const handleDataAction = async (action: string) => {
    setIsLoading(true)
    
    try {
      switch (action) {
        case 'import':
          await simulateImport()
          break
        case 'export':
          await simulateExport()
          break
        case 'backup':
          await simulateBackup()
          break
        case 'restore':
          await simulateRestore()
          break
        default:
          showToast('warning', 'Action not implemented')
      }
    } catch (error) {
      showToast('error', 'Data operation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const simulateImport = async () => {
    showToast('info', 'Processing CSV import...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    showToast('success', 'CSV data imported successfully!')
  }

  const simulateExport = async () => {
    showToast('info', 'Generating PDF export...')
    await new Promise(resolve => setTimeout(resolve, 1500))
    showToast('success', 'PDF exported successfully!')
  }

  const simulateRestore = async () => {
    if (!confirm('Are you sure you want to restore from backup? This will overwrite current data.')) {
      setIsLoading(false)
      return
    }
    showToast('info', 'Restoring from backup...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    showToast('success', 'Database restored successfully!')
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {loading ? '...' : stats.totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#1a73e8] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">👥</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-[#34a853] font-medium">↗ 12%</span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Courses</p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {loading ? '...' : stats.activeCourses}
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#34a853] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">📚</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-[#34a853] font-medium">↗ 8%</span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>

          <div
            className="card clickable-card"
            onClick={() => (window.location.href = '/admin/approvals')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Approvals</p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {loading ? '...' : stats.pendingApprovals}
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#fbbc05] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">⏳</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="badge badge-warning">Needs attention</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  System Health
                </p>
                <p className="text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200 truncate">
                  98%
                </p>
              </div>
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#34a853] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl lg:text-2xl text-white">❤️</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-[#34a853] font-medium">All services online</span>
            </div>
          </div>
        </div>

        {/* Faculty Availability Management */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Faculty Availability - Today</h3>
            <p className="card-description">
              Mark faculty as available/unavailable for quick substitutions
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {loading ? (
              <div className="col-span-full text-center py-4 text-gray-500">Loading faculty...</div>
            ) : faculty.length === 0 ? (
              <div className="col-span-full text-center py-4 text-gray-500">No faculty data available</div>
            ) : (
              faculty.map((faculty: any) => (
              <div key={faculty.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {faculty.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {faculty.department}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked={faculty.isAvailable}
                    onChange={e => {
                      // Simple console log for demo purposes
                      console.log(`Faculty ${faculty.id} availability:`, e.target.checked)
                    }}
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {faculty.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </label>
              </div>
              ))
            )}
          </div>
        </div>

        {/* System Health & Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">System Health Monitor</h3>
              <p className="card-description">Real-time service status</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Django API
                  </span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    FastAPI AI Service
                  </span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Database Connection
                  </span>
                </div>
                <span className="badge badge-success">Healthy</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Data Management</h3>
              <p className="card-description">Import/Export operations</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => handleDataAction('import')}
                disabled={isLoading}
                className="btn-secondary text-left p-3 disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📥</span>
                  <span className="text-sm font-medium">Import CSV</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Bulk upload data</p>
              </button>
              <button 
                onClick={() => handleDataAction('export')}
                disabled={isLoading}
                className="btn-secondary text-left p-3 disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📤</span>
                  <span className="text-sm font-medium">Export PDF</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Generate reports</p>
              </button>
              <button 
                onClick={() => handleDataAction('backup')}
                disabled={isLoading}
                className="btn-secondary text-left p-3 disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">💾</span>
                  <span className="text-sm font-medium">Backup DB</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Create snapshot</p>
              </button>
              <button 
                onClick={() => handleDataAction('restore')}
                disabled={isLoading}
                className="btn-secondary text-left p-3 disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔄</span>
                  <span className="text-sm font-medium">Restore</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">From backup</p>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Trail & Role Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Audit Trail</h3>
              <p className="card-description">Critical system actions</p>
            </div>
            <div className="space-y-3">
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Timetable Approved
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    priya.patel@sih28.edu
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  2 min ago
                </span>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    User Role Changed
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    harsh.sharma@sih28.edu
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  15 min ago
                </span>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Course Updated
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    rajesh.kumar@sih28.edu
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  1h ago
                </span>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Login Failed
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">unknown</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  2h ago
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Role Management</h3>
              <p className="card-description">Permission control</p>
            </div>
            <div className="space-y-3">
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Admin</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">All Access</p>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">-</span>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Staff</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Approvals, Reports</p>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">-</span>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Faculty</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Schedule View</p>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">-</span>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">HOD</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Dept. Management</p>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">-</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Configuration & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">System Configuration</h3>
              <p className="card-description">Global settings</p>
            </div>
            <div className="space-y-3">
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Academic Year
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">2024-25</p>
                </div>
                <button className="text-xs text-[#1a73e8] hover:underline">Edit</button>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Semester Dates
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Jul 1 - Dec 15</p>
                </div>
                <button className="text-xs text-[#1a73e8] hover:underline">Edit</button>
              </div>
              <div className="interactive-element flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Holiday List
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">15 holidays configured</p>
                </div>
                <button className="text-xs text-[#1a73e8] hover:underline">Edit</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Utilization Reports</h3>
              <p className="card-description">Resource usage analytics</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  Classroom Usage
                </span>
                <span className="font-semibold text-[#34a853]">87%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-[#34a853] h-2 rounded-full transition-all duration-300"
                  style={{ width: '87%' }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Faculty Load</span>
                <span className="font-semibold text-[#fbbc05]">73%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-[#fbbc05] h-2 rounded-full transition-all duration-300"
                  style={{ width: '73%' }}
                ></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Conflict Detection</h3>
              <p className="card-description">AI-powered conflict analysis</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  3 Schedule conflicts
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  5 Room overlaps
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  12 Resolved today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Notifications */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Notifications</h3>
            <p className="card-description">Alerts and announcements</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500 rounded-lg">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                AI Engine Update
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Optimization algorithm improved by 15%
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 rounded-lg">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                New Faculty Added
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                3 new faculty members registered
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500 rounded-lg">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Backup Complete
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Daily system backup successful
              </p>
            </div>
          </div>
        </div>

        {/* Strategic Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Strategic Actions</h3>
            <p className="card-description">Administrative control center</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            <button 
              onClick={() => handleStrategicAction('addUser')}
              disabled={isLoading}
              className="btn-primary flex flex-col items-center gap-2 p-4 disabled:opacity-50"
            >
              <span className="text-2xl">👤</span>
              <span className="text-xs sm:text-sm font-medium">Add User</span>
            </button>
            <button 
              onClick={() => handleStrategicAction('roles')}
              disabled={isLoading}
              className="btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-50"
            >
              <span className="text-2xl">🔐</span>
              <span className="text-xs sm:text-sm font-medium">Roles</span>
            </button>
            <button 
              onClick={() => handleStrategicAction('audit')}
              disabled={isLoading}
              className="btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-50"
            >
              <span className="text-2xl">📊</span>
              <span className="text-xs sm:text-sm font-medium">Audit</span>
            </button>
            <button 
              onClick={() => handleStrategicAction('config')}
              disabled={isLoading}
              className="btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-50"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-xs sm:text-sm font-medium">Config</span>
            </button>
            <button 
              onClick={() => handleStrategicAction('backup')}
              disabled={isLoading}
              className="btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-50"
            >
              <span className="text-2xl">{isLoading ? '⏳' : '💾'}</span>
              <span className="text-xs sm:text-sm font-medium">Backup</span>
            </button>
            <button 
              onClick={() => handleStrategicAction('reports')}
              disabled={isLoading}
              className="btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-50"
            >
              <span className="text-2xl">{isLoading ? '⏳' : '📈'}</span>
              <span className="text-xs sm:text-sm font-medium">Reports</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
