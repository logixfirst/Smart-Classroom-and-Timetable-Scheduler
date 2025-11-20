import DashboardLayout from '@/components/dashboard-layout'
import RoleManager from './components/RoleManager'
import BackupManager from './components/BackupManager'
import AcademicYearForm from './components/AcademicYearForm'
import WorkingDaysManager from './components/WorkingDaysManager'
import ThemeToggle from './components/ThemeToggle'

export default function SettingsPage() {
  return (
    <DashboardLayout role="admin" pageTitle="System Settings">
      <div className="space-y-4 sm:space-y-6">
        {/* Theme Settings */}
        <ThemeToggle />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <AcademicYearForm />
          <WorkingDaysManager />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <RoleManager />
          <BackupManager />
        </div>
      </div>
    </DashboardLayout>
  )
}
