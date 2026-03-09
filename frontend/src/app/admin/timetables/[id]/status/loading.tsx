import { Skeleton } from '@/components/LoadingSkeletons'
import PageHeader from '@/components/shared/PageHeader'

export default function StatusLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generation Status"
        parentLabel="Timetables"
        parentHref="/admin/timetables"
      />
      {/* Progress bar area */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton style={{ height: '18px', width: '30%' }} />
          <Skeleton style={{ height: '18px', width: '12%' }} />
        </div>
        <Skeleton style={{ height: '10px', width: '100%', borderRadius: '9999px' }} />
        <Skeleton style={{ height: '14px', width: '50%' }} />
      </div>
      {/* Stage details */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 space-y-3">
        <Skeleton style={{ height: '16px', width: '40%' }} />
        <Skeleton style={{ height: '14px', width: '70%' }} />
        <Skeleton style={{ height: '14px', width: '55%' }} />
      </div>
    </div>
  )
}
