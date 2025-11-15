/**
 * Timetable Export Utilities
 * Handles PDF and Excel export functionality for timetables
 */
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface TimetableSlot {
  day: string
  time_slot: string
  subject_name: string
  faculty_name: string
  classroom_number: string
  batch_id: string
}

interface ExportOptions {
  filename?: string
  title?: string
  department?: string
  batch?: string
  semester?: number
  academicYear?: string
}

/**
 * Export timetable to PDF using html2canvas and jsPDF
 */
export const exportTimetableToPDF = async (
  elementId: string,
  slots: TimetableSlot[],
  options: ExportOptions = {}
): Promise<void> => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Element not found for PDF export')
    }

    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    // Calculate dimensions
    const imgWidth = 297 // A4 landscape width in mm
    const pageHeight = 210 // A4 landscape height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    // Add title page
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text(options.title || 'Timetable', 148.5, 30, { align: 'center' })

    if (options.department || options.batch) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      const subtitle = `${options.department || ''} - ${options.batch || ''} - Semester ${options.semester || ''}`
      pdf.text(subtitle, 148.5, 45, { align: 'center' })
    }

    if (options.academicYear) {
      pdf.setFontSize(12)
      pdf.text(`Academic Year: ${options.academicYear}`, 148.5, 55, { align: 'center' })
    }

    // Add timetable image
    let position = 70
    pdf.addImage(
      imgData,
      'PNG',
      10,
      position,
      imgWidth - 20,
      (imgHeight * (imgWidth - 20)) / imgWidth
    )

    // Add page numbers and metadata
    const pageCount = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(10)
      pdf.text(`Page ${i} of ${pageCount}`, 280, 200)
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 200)
    }

    // Save the PDF
    const filename = options.filename || `timetable_${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export PDF')
  }
}

/**
 * Export timetable to Excel format
 */
export const exportTimetableToExcel = (
  slots: TimetableSlot[],
  options: ExportOptions = {}
): void => {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new()

    // Convert slots to Excel format
    const worksheetData = [
      // Header row
      ['Day', 'Time Slot', 'Subject', 'Faculty', 'Classroom', 'Batch'],
      // Data rows
      ...slots.map(slot => [
        slot.day,
        slot.time_slot,
        slot.subject_name,
        slot.faculty_name,
        slot.classroom_number,
        slot.batch_id,
      ]),
    ]

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData)

    // Style the header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:F1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue

      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'CCCCCC' } },
        alignment: { horizontal: 'center' },
      }
    }

    // Set column widths
    ws['!cols'] = [
      { width: 12 }, // Day
      { width: 15 }, // Time Slot
      { width: 25 }, // Subject
      { width: 20 }, // Faculty
      { width: 15 }, // Classroom
      { width: 12 }, // Batch
    ]

    // Add metadata sheet
    const metaData = [
      ['Timetable Export Information'],
      [''],
      ['Generated On:', new Date().toLocaleString()],
      ['Department:', options.department || 'N/A'],
      ['Batch:', options.batch || 'N/A'],
      ['Semester:', options.semester?.toString() || 'N/A'],
      ['Academic Year:', options.academicYear || 'N/A'],
      ['Total Classes:', slots.length.toString()],
    ]

    const metaWs = XLSX.utils.aoa_to_sheet(metaData)

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable')
    XLSX.utils.book_append_sheet(wb, metaWs, 'Information')

    // Generate Excel file and save
    const filename = options.filename || `timetable_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, filename)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    throw new Error('Failed to export Excel file')
  }
}

/**
 * Export timetable to CSV format
 */
export const exportTimetableToCSV = (slots: TimetableSlot[], options: ExportOptions = {}): void => {
  try {
    // Create CSV content
    const headers = ['Day', 'Time Slot', 'Subject', 'Faculty', 'Classroom', 'Batch']
    const csvContent = [
      headers.join(','),
      ...slots.map(slot =>
        [
          slot.day,
          slot.time_slot,
          slot.subject_name,
          slot.faculty_name,
          slot.classroom_number,
          slot.batch_id,
        ]
          .map(field => `"${field}"`)
          .join(',')
      ),
    ].join('\n')

    // Create blob and save
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const filename = options.filename || `timetable_${new Date().toISOString().slice(0, 10)}.csv`
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    throw new Error('Failed to export CSV file')
  }
}

/**
 * Export timetable to iCalendar (.ics) format for calendar applications
 */
export const exportTimetableToICS = (slots: TimetableSlot[], options: ExportOptions = {}): void => {
  try {
    // Map day names to numbers (0 = Sunday)
    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timetable System//Timetable Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ]

    slots.forEach((slot, index) => {
      const dayName = slot.day.toLowerCase()
      const dayNumber = dayMap[dayName]

      if (dayNumber === undefined) return

      // Parse time slot (assuming format like "09:00-10:00")
      const [startTime, endTime] = slot.time_slot.split('-')

      // Create a date for this week (starting from Monday)
      const now = new Date()
      const monday = new Date(now.setDate(now.getDate() - now.getDay() + 1))
      const eventDate = new Date(monday)
      eventDate.setDate(monday.getDate() + (dayNumber === 0 ? 6 : dayNumber - 1))

      // Set start and end times
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)

      const startDateTime = new Date(eventDate)
      startDateTime.setHours(startHour, startMin, 0)

      const endDateTime = new Date(eventDate)
      endDateTime.setHours(endHour, endMin, 0)

      // Format dates for ICS
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${index}-${Date.now()}@timetable.system`,
        `DTSTART:${formatDate(startDateTime)}`,
        `DTEND:${formatDate(endDateTime)}`,
        `SUMMARY:${slot.subject_name}`,
        `DESCRIPTION:Faculty: ${slot.faculty_name}\\nClassroom: ${slot.classroom_number}\\nBatch: ${slot.batch_id}`,
        `LOCATION:${slot.classroom_number}`,
        'RRULE:FREQ=WEEKLY;COUNT=15',
        'END:VEVENT'
      )
    })

    icsContent.push('END:VCALENDAR')

    // Create blob and save
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8;' })
    const filename = options.filename || `timetable_${new Date().toISOString().slice(0, 10)}.ics`
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error exporting to ICS:', error)
    throw new Error('Failed to export calendar file')
  }
}
