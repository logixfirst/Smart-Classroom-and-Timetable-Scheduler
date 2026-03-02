'use client'

import dynamic from 'next/dynamic'
import TimetableGrid from '@/components/shared/TimetableGrid'

const ExportButton = dynamic(() => import('@/components/shared/ExportButton'), {
  ssr: false,
  loading: () => <button className="btn-primary text-xs px-3 py-2">📥 Export</button>,
})

export interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
}

interface Props {
  schedule: TimeSlot[]
}

export function WeeklyScheduleCard({ schedule }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="card-title">My Weekly Schedule</h3>
            <p className="card-description">Your personalized teaching timetable</p>
          </div>
          <ExportButton
            slots={schedule.map(slot => ({
              day: slot.day,
              time_slot: slot.time,
              subject_name: slot.subject,
              faculty_name: slot.faculty,
              classroom_number: slot.classroom,
              batch_id: slot.batch,
            }))}
            tableElementId="faculty-schedule-grid"
            options={{
              title: 'Faculty Weekly Schedule',
              department: 'Faculty',
              batch: 'Teaching Schedule',
              academicYear: '2024-25',
            }}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div id="faculty-schedule-grid">
          <TimetableGrid schedule={schedule} />
        </div>
      </div>
    </div>
  )
}
