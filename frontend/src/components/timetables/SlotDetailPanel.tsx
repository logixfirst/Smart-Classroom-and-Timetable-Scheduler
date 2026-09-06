'use client'

/**
 * SlotDetailPanel - slot details rendered as sidebar, inline card, or dialog.
 */

import { X, User, MapPin, BookOpen, AlertCircle, CheckCircle, Users } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '@/components/shared/Avatar'
import type { TimetableSlotDetailed } from '@/types/timetable'

interface SlotDetailPanelProps {
  slot: TimetableSlotDetailed | null
  onClose: () => void
  onRequestSubstitution?: (slot: TimetableSlotDetailed) => void
  substitutionLoading?: boolean
  mode?: 'sidebar' | 'inline' | 'dialog'
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Pre-defined Tailwind classes for year colours — no inline styles needed.
const YEAR_CLASSES = [
  'bg-[#e8f0fe] text-[#1a73e8]',
  'bg-[#e6f4ea] text-[#34a853]',
  'bg-[#fef7e0] text-[#f9ab00]',
  'bg-[#fce8e6] text-[#ea4335]',
]
const YEAR_FALLBACK = 'bg-[#f3e8fd] text-[#9334ea]'

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[10px]">
      <span className="shrink-0 mt-[1px] [color:var(--color-text-muted)]">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.05em] mb-[2px] [color:var(--color-text-muted)]">
          {label}
        </p>
        <p className="text-[13px] font-medium [color:var(--color-text-primary)]">{children}</p>
      </div>
    </div>
  )
}



export function SlotDetailPanel({
  slot,
  onClose,
  onRequestSubstitution,
  substitutionLoading = false,
  mode = 'sidebar',
}: SlotDetailPanelProps) {
  const isOpen = slot !== null
  const isInline = mode === 'inline'
  const isDialog = mode === 'dialog'

  if ((isInline || isDialog) && !isOpen) return null

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const panelContent = (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close slot details"
          onClick={onClose}
          className={isInline ? 'hidden' : 'fixed top-0 left-0 w-screen h-screen z-[300] bg-[#00000052]'}
        />
      )}

      <div
        className={[
          isDialog
            ? 'fixed z-[310] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex flex-col bg-[#d3dbe5] rounded-[28px] border border-[var(--color-border)] shadow-2xl overflow-hidden'
            : '',
          isDialog
            ? ''
            : isInline
            ? 'w-full lg:w-[340px] min-h-[420px] flex flex-col [background:var(--color-bg-surface)] [border-left:1px_solid_var(--color-border)]'
            : 'fixed top-0 right-0 h-full flex flex-col z-[200] w-[320px] [background:var(--color-bg-surface)] [border-left:1px_solid_var(--color-border)] shadow-[-4px_0_24px_rgba(0,0,0,0.10)] transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(.4,0,.2,1)]',
          isInline || isDialog ? '' : (isOpen ? 'translate-x-0' : 'translate-x-full'),
        ].join(' ')}
      >
        {/* Header */}
        <div
          className={[
            'flex items-center justify-between px-[18px] [border-bottom:1px_solid_var(--color-border)]',
            isDialog ? 'h-[80.8px] bg-[#c4c7c5] uW2Fw-Sx9Kwc-OWXEXe-n2to0e' : 'py-4 [background:var(--color-header-bg)]',
          ].join(' ')}
        >
          <p className={isDialog ? 'uW2Fw-k2Wrsb' : 'text-sm font-bold [color:var(--color-text-primary)]'}>Slot Details</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close slot details"
            title="Close"
            className="flex items-center p-1 rounded border-0 bg-transparent cursor-pointer [color:var(--color-text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {slot && (
          <div className="flex-1 overflow-y-auto px-[18px] py-5 flex flex-col gap-5 bg-[#d3dbe5]">

          {/* Conflict banner */}
          {slot.has_conflict ? (
            <div className="flex items-start gap-2 px-3 py-[10px] rounded-lg border border-[#ea4335] bg-[#fce8e6]">
              <AlertCircle size={15} color="#ea4335" className="shrink-0 mt-[1px]" />
              <p className="text-xs font-medium text-[#c5221f]">
                {slot.conflict_description || 'Scheduling conflict detected for this slot.'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-md border border-[#34a853] bg-[#e6f4ea] w-fit">
              <CheckCircle size={13} color="#34a853" />
              <span className="text-[11px] font-semibold text-[#137333]">No conflicts</span>
            </div>
          )}

          {/* Time */}
          <div>
            <p className="text-[11px] font-medium uppercase mb-1 [color:var(--color-text-muted)]">Schedule</p>
            <p className="text-[15px] font-bold [color:var(--color-text-primary)]">
              {DAY_NAMES[slot.day] ?? `Day ${slot.day}`}
            </p>
            <p className="text-[13px] [color:var(--color-text-secondary)]">{slot.time_slot}</p>
          </div>

          {/* Course */}
          <InfoRow icon={<BookOpen size={15} />} label="Course">
            <>
              <span className="font-bold">{slot.subject_name}</span>
              {slot.subject_code && (
                <span className="text-[11px] ml-[6px] [color:var(--color-text-muted)]">{slot.subject_code}</span>
              )}
            </>
          </InfoRow>

          {/* Faculty */}
          <InfoRow icon={<Avatar name={slot.faculty_name} size={32} />} label="Faculty">
            {slot.faculty_name || '\u2014'}
          </InfoRow>

          {/* Room */}
          <InfoRow icon={<MapPin size={15} />} label="Room">
            <>
              {slot.room_number || '\u2014'}
              {slot.room_capacity > 0 && (
                <span className="text-[11px] ml-[6px] [color:var(--color-text-muted)]">
                  (capacity {slot.room_capacity})
                </span>
              )}
            </>
          </InfoRow>

          {/* Enrollment */}
          {slot.enrolled_count > 0 && (
            <InfoRow icon={<Users size={15} />} label="Enrolled">
              <>
                <span
                  className={`font-bold ${slot.enrolled_count > slot.room_capacity ? 'text-[#ea4335]' : ''}`}
                >
                  {slot.enrolled_count}
                </span>
                {slot.room_capacity > 0 && (
                  <span className="[color:var(--color-text-muted)]"> / {slot.room_capacity}</span>
                )}
              </>
            </InfoRow>
          )}

          {/* Year / Section chips */}
          {(slot.section || slot.year) && (
            <div className="flex gap-2 flex-wrap">
              {slot.year && (
                <span
                  className={`text-[11px] font-semibold px-2 py-[3px] rounded ${YEAR_CLASSES[(slot.year - 1)] ?? YEAR_FALLBACK}`}
                >
                  Year {slot.year}
                </span>
              )}
              {slot.section && (
                <span className="text-[11px] font-medium px-2 py-[3px] rounded [background:var(--color-bg-surface-2)] [color:var(--color-text-secondary)]">
                  Section {slot.section}
                </span>
              )}
            </div>
          )}

          {/* Batch */}
          {slot.batch_name && (
            <InfoRow icon={<Users size={15} />} label="Batch">
              {slot.batch_name}
            </InfoRow>
          )}

          {!isDialog && onRequestSubstitution && (
            <button
              type="button"
              onClick={() => {
                if (slot) onRequestSubstitution(slot)
              }}
              disabled={substitutionLoading}
              className="btn-primary mt-1 w-full h-9 text-xs disabled:opacity-50"
            >
              {substitutionLoading ? 'Finding Proxy…' : 'Find Proxy'}
            </button>
          )}
          </div>
        )}

        {slot && isDialog && onRequestSubstitution && (
          <div className="px-[18px] h-[80.8px] flex items-center [border-top:1px_solid_var(--color-border)] bg-[#c4c7c5]">
            <button
              type="button"
              onClick={() => {
                if (slot) onRequestSubstitution(slot)
              }}
              disabled={substitutionLoading}
              className="btn-primary w-full h-9 text-xs disabled:opacity-50"
            >
              {substitutionLoading ? 'Finding Proxy…' : 'Find Proxy'}
            </button>
          </div>
        )}
      </div>
    </>
  )

  if (isDialog && typeof document !== 'undefined') {
    return createPortal(panelContent, document.body)
  }

  return panelContent
}
