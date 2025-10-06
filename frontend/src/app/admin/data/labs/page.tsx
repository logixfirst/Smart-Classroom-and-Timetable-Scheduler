'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

interface Lab {
  lab_id: string
  lab_name: string
  capacity: number
  department: {
    department_id: string
    department_name: string
  }
}

interface Department {
  department_id: string
  department_name: string
}

export default function LabsPage() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    lab_id: '',
    lab_name: '',
    capacity: '',
    department: ''
  })

  useEffect(() => {
    fetchLabs()
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.getDepartments()
      if (response.data) {
        const deptData = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || []
        setDepartments(deptData)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const fetchLabs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.getLabs()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        // Handle both paginated and non-paginated responses
        const labData = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || []
        setLabs(labData)
      }
    } catch (err) {
      setError('Failed to fetch labs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const labPayload = {
        lab_id: formData.lab_id,
        lab_name: formData.lab_name,
        capacity: parseInt(formData.capacity),
        department_id: formData.department
      }

      const response = editingId 
        ? await apiClient.updateLab(editingId, labPayload)
        : await apiClient.createLab(labPayload)

      if (response.error) {
        alert('Failed to save lab: ' + response.error)
      } else {
        fetchLabs()
        resetForm()
      }
    } catch (error) {
      alert('Failed to save lab')
      console.error('Failed to save lab:', error)
    }
  }

  const handleEdit = (lab: Lab) => {
    setFormData({
      lab_id: lab.lab_id,
      lab_name: lab.lab_name,
      capacity: lab.capacity.toString(),
      department: lab.department.department_id
    })
    setEditingId(lab.lab_id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lab?')) return
    
    try {
      const response = await apiClient.deleteLab(id)
      if (response.error) {
        alert('Failed to delete lab: ' + response.error)
      } else {
        fetchLabs()
      }
    } catch (error) {
      console.error('Failed to delete lab:', error)
    }
  }

  const resetForm = () => {
    setFormData({ lab_id: '', lab_name: '', capacity: '', department: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const filteredLabs = labs.filter(lab =>
    lab.lab_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.lab_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading labs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchLabs} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
            Lab Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total: {filteredLabs.length} labs
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Labs</h3>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
            <div className="relative flex-1">
              <label htmlFor="lab-search" className="sr-only">Search labs</label>
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <input
                id="lab-search"
                placeholder="Search labs..."
                className="input-primary pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredLabs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl sm:text-6xl mb-4">🔬</div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
              No Labs Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {labs.length === 0 ? 'No lab data has been imported yet.' : 'No labs match your search criteria.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-3">
              {filteredLabs.map((lab) => (
                <div key={lab.lab_id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">{lab.lab_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{lab.lab_id}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="badge badge-neutral text-xs">{lab.department.department_name}</span>
                      <span className="badge badge-info text-xs">Capacity: {lab.capacity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Lab ID</th>
                    <th className="table-header-cell">Lab Name</th>
                    <th className="table-header-cell">Department</th>
                    <th className="table-header-cell">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabs.map((lab) => (
                    <tr key={lab.lab_id} className="table-row">
                      <td className="table-cell">
                        <span className="font-mono text-sm">{lab.lab_id}</span>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{lab.lab_name}</div>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-neutral text-xs">{lab.department.department_name}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-info text-xs">{lab.capacity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
