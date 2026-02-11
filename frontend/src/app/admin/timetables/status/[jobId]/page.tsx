'use client'

import { useParams, useRouter } from 'next/navigation'

export default function TimetableStatusPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Processing timetable generation...</p>
        <p className="mt-2 text-sm text-gray-500">Job ID: {jobId}</p>
        <button
          onClick={() => router.push('/admin/timetables')}
          className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          Back to Timetables
        </button>
      </div>
    </div>
  )
}
