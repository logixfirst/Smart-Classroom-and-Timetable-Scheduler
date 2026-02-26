'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/Toast'
import { GoogleSpinner } from '@/components/ui/GoogleSpinner'

interface Building {
  id: number
  building_id: string
  building_name: string
  location?: string
  total_floors?: number
}

interface BuildingsResponse {
  results?: Building[]
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.request<Building[] | BuildingsResponse>('/buildings/')
      if (response.error) {
        showToast('error', response.error)
      } else if (response.data) {
        setBuildings(Array.isArray(response.data) ? response.data : (response.data as BuildingsResponse).results || [])
      }
    } catch (err) {
      showToast('error', 'Failed to load buildings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Total: {buildings.length} buildings</p>
        <button className="btn-primary">Add Building</button>
      </div>

      <div className="card">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <GoogleSpinner size={48} className="mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading buildings...</p>
          </div>
        )}

        {!isLoading && buildings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No buildings found</p>
          </div>
        )}

        {!isLoading && buildings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Building ID</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Location</th>
                  <th className="table-header-cell">Floors</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map(building => (
                  <tr key={building.id} className="table-row">
                    <td className="table-cell">{building.building_id}</td>
                    <td className="table-cell">{building.building_name}</td>
                    <td className="table-cell">{building.location || '-'}</td>
                    <td className="table-cell">{building.total_floors || '-'}</td>
                    <td className="table-cell">
                      <button className="btn-ghost text-xs px-2 py-1">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
