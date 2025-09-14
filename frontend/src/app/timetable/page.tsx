import TimetableViewer from '@/components/ui/timetable-viewer'

export default function PublicTimetablePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1f1f1f] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Class Timetable
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View the current approved timetable for all departments
          </p>
        </div>
        
        <TimetableViewer />
      </div>
    </div>
  )
}