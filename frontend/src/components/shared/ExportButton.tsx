/**
 * Export Button Component
 * Provides multiple export options for timetable data
 */
import { useState } from 'react'
import {
  exportTimetableToPDF,
  exportTimetableToExcel,
  exportTimetableToCSV,
  exportTimetableToICS,
} from '@/lib/exportUtils'

interface TimetableSlot {
  day: string
  time_slot: string
  subject_name: string
  faculty_name: string
  classroom_number: string
  batch_id: string
}

interface ExportButtonProps {
  slots: TimetableSlot[]
  className?: string
  disabled?: boolean
  options?: {
    title?: string
    department?: string
    batch?: string
    semester?: number
    academicYear?: string
  }
  // For PDF export - requires a table element ID
  tableElementId?: string
}

export default function ExportButton({
  slots,
  className = '',
  disabled = false,
  options = {},
  tableElementId = 'timetable-grid',
}: ExportButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'excel' | 'csv' | 'ics') => {
    if (slots.length === 0) {
      alert('No timetable data to export')
      return
    }

    setIsExporting(true)
    setShowDropdown(false)

    try {
      const exportOptions = {
        ...options,
        filename: `timetable_${options.department || 'dept'}_${options.batch || 'batch'}_${new Date().toISOString().slice(0, 10)}`,
      }

      switch (format) {
        case 'pdf':
          if (!tableElementId) {
            throw new Error('Table element ID required for PDF export')
          }
          await exportTimetableToPDF(tableElementId, slots, exportOptions)
          break

        case 'excel':
          exportTimetableToExcel(slots, {
            ...exportOptions,
            filename: exportOptions.filename + '.xlsx',
          })
          break

        case 'csv':
          exportTimetableToCSV(slots, {
            ...exportOptions,
            filename: exportOptions.filename + '.csv',
          })
          break

        case 'ics':
          exportTimetableToICS(slots, {
            ...exportOptions,
            filename: exportOptions.filename + '.ics',
          })
          break
      }

      // Show success message briefly
      setTimeout(() => {
        // Could add a toast notification here
      }, 100)
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isExporting}
        className={`btn-secondary ${className} ${disabled || isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isExporting ? (
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
            Exporting...
          </div>
        ) : (
          <div className="flex items-center">
            <span className="mr-2">📤</span>
            Export
            <span className="ml-1">▼</span>
          </div>
        )}
      </button>

      {showDropdown && !isExporting && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2d3136] border border-gray-200 dark:border-[#3c4043] rounded-lg shadow-lg z-20">
            <div className="py-1">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center"
              >
                <span className="mr-3">📄</span>
                Export as PDF
                <span className="ml-auto text-xs text-gray-500">High Quality</span>
              </button>

              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center"
              >
                <span className="mr-3">📊</span>
                Export as Excel
                <span className="ml-auto text-xs text-gray-500">Spreadsheet</span>
              </button>

              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center"
              >
                <span className="mr-3">📋</span>
                Export as CSV
                <span className="ml-auto text-xs text-gray-500">Data Only</span>
              </button>

              <div className="border-t border-gray-200 dark:border-[#3c4043] my-1"></div>

              <button
                onClick={() => handleExport('ics')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center"
              >
                <span className="mr-3">📅</span>
                Export as Calendar
                <span className="ml-auto text-xs text-gray-500">.ics</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
