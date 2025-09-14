'use client'

import DashboardLayout from '@/components/dashboard-layout'
import TimetableForm from '@/components/ui/timetableform'

export default function CreateTimetablePage() {
  return (
    <DashboardLayout role="admin">
      <TimetableForm />
    </DashboardLayout>
  )
}