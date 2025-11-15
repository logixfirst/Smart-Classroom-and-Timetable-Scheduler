'use client'

import { useState } from 'react'

interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
  facultyId?: number
}

interface Faculty {
  id: number
  name: string
  isAvailable: boolean
  subjects: string[]
}

interface SubstitutionModalProps {
  isOpen: boolean
  onClose: () => void
  slot: TimeSlot | null
  onConfirmSubstitution: (slotData: TimeSlot, newFacultyId: number) => void
}

export default function SubstitutionModal({
  isOpen,
  onClose,
  slot,
  onConfirmSubstitution,
}: SubstitutionModalProps) {
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock available faculty data - in real app, this would come from API
  const availableFaculty: Faculty[] = [
    {
      id: 1,
      name: 'Dr. Rajesh Kumar',
      isAvailable: true,
      subjects: ['Data Structures', 'Algorithms'],
    },
    {
      id: 2,
      name: 'Prof. Meera Sharma',
      isAvailable: true,
      subjects: ['Database Systems', 'Data Structures'],
    },
    {
      id: 4,
      name: 'Dr. Anita Verma',
      isAvailable: true,
      subjects: ['Machine Learning', 'Data Science'],
    },
    {
      id: 5,
      name: 'Prof. Suresh Reddy',
      isAvailable: true,
      subjects: ['Web Development', 'Software Engineering'],
    },
  ]

  // Filter faculty who can teach the subject
  const qualifiedFaculty = availableFaculty.filter(
    faculty =>
      faculty.isAvailable &&
      slot?.subject &&
      faculty.subjects.some(
        subject =>
          subject.toLowerCase().includes(slot.subject.toLowerCase()) ||
          slot.subject.toLowerCase().includes(subject.toLowerCase())
      )
  )

  const handleConfirm = async () => {
    if (!slot || !selectedFacultyId) return

    setIsLoading(true)
    try {
      // TODO: API call to update timetable
      await new Promise(resolve => setTimeout(resolve, 1000)) // Mock API delay
      onConfirmSubstitution(slot, selectedFacultyId)
      onClose()
    } catch (error) {
      console.error('Failed to update substitution:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !slot) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Faculty Substitution
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Class Details */}
          <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
              Conflicted Class Details
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subject:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{slot.subject}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600 dark:text-gray-400">Time:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{slot.time}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600 dark:text-gray-400">Day:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                  {slot.day}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600 dark:text-gray-400">Batch:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{slot.batch}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600 dark:text-gray-400">Classroom:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {slot.classroom}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Faculty:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {slot.faculty} (Unavailable)
                </span>
              </div>
            </div>
          </div>

          {/* Faculty Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Select Substitute Faculty
            </h4>
            {qualifiedFaculty.length > 0 ? (
              <div className="space-y-2">
                {qualifiedFaculty.map(faculty => (
                  <label
                    key={faculty.id}
                    className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                  >
                    <input
                      type="radio"
                      name="faculty"
                      value={faculty.id}
                      checked={selectedFacultyId === faculty.id}
                      onChange={() => setSelectedFacultyId(faculty.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {faculty.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Qualified subjects: {faculty.subjects.join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No qualified faculty available for this subject.</p>
                <p className="text-xs mt-1">
                  Please check faculty availability or subject mappings.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 sm:flex-none order-2 sm:order-1"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedFacultyId || isLoading || qualifiedFaculty.length === 0}
            className="btn-primary flex-1 sm:flex-none order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="loading-spinner w-4 h-4"></div>
                <span>Updating...</span>
              </div>
            ) : (
              'Confirm Substitution'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
