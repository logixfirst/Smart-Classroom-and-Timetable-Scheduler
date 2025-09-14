import DashboardLayout from '@/components/dashboard-layout'
import TimetableForm from '@/components/ui/timetableform'

export default function TimetablesPage() {
  return (
    <DashboardLayout role="admin">
      <TimetableForm />
    </DashboardLayout>
  )
}