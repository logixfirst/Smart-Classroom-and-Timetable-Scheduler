'use client'

import { VariantCardSkeleton } from '@/components/timetables/VariantGrid'
import { TimetableGridSkeleton } from '@/components/LoadingSkeletons'
import PageHeader from '@/components/shared/PageHeader'

export default function ReviewLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Timetable"
        parentLabel="Timetables"
        parentHref="/admin/timetables"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <VariantCardSkeleton />
        <VariantCardSkeleton />
        <VariantCardSkeleton />
      </div>
      <TimetableGridSkeleton />
    </div>
  )
}
