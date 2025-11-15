import DashboardLayout from '@/components/dashboard-layout'
import RoleManager from './components/RoleManager'
import BackupManager from './components/BackupManager'
import AcademicYearForm from './components/AcademicYearForm'
import WorkingDaysManager from './components/WorkingDaysManager'
import ThemeToggle from './components/ThemeToggle'

export default function SettingsPage() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0f0f0f] dark:text-white">
            System Settings
          </h1>
        </div>

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
