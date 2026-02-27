'use client'

import { useState, useRef, useEffect } from 'react'

interface TimeSlot {
  day: string
  time: string
  subject: string
  faculty: string
  classroom: string
  batch: string
  facultyId?: number
  isConflicted?: boolean
}

interface Faculty {
  id: number
  name: string
  isAvailable: boolean
  subjects: string[]
}

interface TimetableGridProps {
  schedule: TimeSlot[]
  className?: string
  isAdminView?: boolean
  onSlotClick?: (slot: TimeSlot) => void
}

export default function TimetableGrid({
  schedule,
  className = '',
  isAdminView = false,
  onSlotClick,
}: TimetableGridProps) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const times = [
    '9:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-13:00',
    '14:00-15:00',
    '15:00-16:00',
    '16:00-17:00',
  ]

  const todayName = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase()
  const defaultDay = days.includes(todayName) ? todayName : days[0]
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay)

  // Lazy-render the desktop table via IntersectionObserver.
  // The mobile pill-view is cheap (one day at a time), so only the full
  // week table (6 cols × 7 rows) is deferred until it enters the viewport.
  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [tableInView, setTableInView] = useState(false)

  useEffect(() => {
    if (tableInView) return
    const el = tableWrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTableInView(true) },
      { rootMargin: '300px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [tableInView])

  return (
    <div className={`w-full ${className}`}>
      {/* ── Mobile Day-Pill + Card View (xs / sm) ─────────────────────── */}
      <div className="block sm:hidden">
        {/* Day pill selector */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
          style={{ marginBottom: '12px' }}
        >
          {days.map(day => {
            const isActive = day === selectedDay
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  flexShrink: 0,
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isActive ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                  color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background-color 100ms',
                  textTransform: 'capitalize',
                }}
              >
                {day.slice(0, 3).charAt(0).toUpperCase() + day.slice(1, 3)}
              </button>
            )
          })}
        </div>

        {/* Slots for selected day */}
        <div className="space-y-2">
          {times.map(time => {
            const slot = schedule.find(s => s.day === selectedDay && s.time === time)

            if (!slot) {
              return (
                <div key={time} className="tt-mobile-slot tt-mobile-slot-empty">
                  <span className="tt-mobile-slot-time">{time}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Free</span>
                </div>
              )
            }

            const isConflicted = slot.isConflicted

            return (
              <div
                key={time}
                className="tt-mobile-slot"
                style={
                  isConflicted
                    ? { borderLeft: '3px solid var(--color-danger)', background: 'var(--color-danger-subtle)' }
                    : {}
                }
                onClick={() => isAdminView && isConflicted && onSlotClick && onSlotClick(slot)}
              >
                <span className="tt-mobile-slot-time">{time}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tt-mobile-slot-course">{slot.subject}</div>
                  <div className="tt-mobile-slot-meta">
                    {slot.faculty} &bull; {slot.classroom} &bull; {slot.batch}
                  </div>
                </div>
                {isConflicted && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-danger-text)',
                      background: 'var(--color-danger-subtle)',
                      border: '1px solid var(--color-danger)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 6px',
                    }}
                  >
                    Conflict
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tablet / Desktop Table View (sm+) ─────────────────────────── */}
      <div ref={tableWrapRef} className="hidden sm:block overflow-x-auto">
        {!tableInView && (
          <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        )}
        {/* Only build the full week DOM once the section enters the viewport */}
        {!tableInView ? null : (
        <table className="table text-xs sm:text-sm min-w-full">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell tt-time-cell" style={{ width: '96px' }}>
                Time
              </th>
              {days.map(day => (
                <th
                  key={day}
                  className="table-header-cell capitalize"
                  style={{ minWidth: '128px' }}
                >
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time} className="table-row">
                <td className="table-cell tt-time-cell font-medium whitespace-nowrap align-top">
                  {time}
                </td>
                {days.map(day => {
                  const slot = schedule.find(s => s.day === day && s.time === time)
                  const isConflicted = slot?.isConflicted

                  return (
                    <td
                      key={`${day}-${time}`}
                      className="table-cell align-top"
                      style={{ padding: '8px', minHeight: '80px', verticalAlign: 'top' }}
                    >
                      {slot && (
                        <div
                          style={{
                            minHeight: '80px',
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${isConflicted ? 'var(--color-danger)' : 'var(--color-primary-subtle)'}`,
                            background: isConflicted
                              ? 'var(--color-danger-subtle)'
                              : 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                            cursor: isAdminView && isConflicted ? 'pointer' : 'default',
                            position: 'relative',
                          }}
                          onClick={() =>
                            isAdminView && isConflicted && onSlotClick && onSlotClick(slot)
                          }
                        >
                          {isConflicted && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '10px',
                                height: '10px',
                                background: 'var(--color-danger)',
                                borderRadius: '50%',
                                border: '2px solid var(--color-bg-surface)',
                              }}
                            />
                          )}
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: isConflicted
                                ? 'var(--color-danger-text)'
                                : 'var(--color-text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '3px',
                            }}
                          >
                            {slot.subject}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: isConflicted
                                ? 'var(--color-danger-text)'
                                : 'var(--color-text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '2px',
                            }}
                          >
                            {slot.faculty}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {slot.classroom} &bull; {slot.batch}
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  )
}
