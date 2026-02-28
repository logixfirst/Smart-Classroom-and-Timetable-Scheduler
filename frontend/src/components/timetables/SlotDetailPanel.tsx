'use client'

/**
 * SlotDetailPanel — right slide-in panel showing full details for a timetable cell.
 *
 * NOT a modal — stays open while browsing the grid.
 * Slides in with translateX animation (300ms ease).
 *
 * Shows:
 *   - Course name + code
 *   - Department + Year / Section
 *   - Teacher initial avatar + name
 *   - Room + capacity / enrolled
 *   - Conflict status
 */

import { X, User, MapPin, BookOpen, AlertCircle, CheckCircle, Users } from 'lucide-react'
import type { TimetableSlotDetailed } from '@/types/timetable'

interface SlotDetailPanelProps {
  slot: TimetableSlotDetailed | null
  onClose: () => void
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function row(icon: React.ReactNode, label: string, value: string | React.ReactNode) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 1 }}>
        {icon}
      </span>
      <div>
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function TeacherAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: '#e8f0fe',
      color: '#1a73e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {initials || <User size={14} />}
    </div>
  )
}

export function SlotDetailPanel({ slot, onClose }: SlotDetailPanelProps) {
  const isOpen = slot !== null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100%',
      width: 320,
      background: 'var(--color-bg-surface)',
      borderLeft: '1px solid var(--color-border)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Slot Details
        </p>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 6,
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      {slot && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Conflict banner */}
          {slot.has_conflict && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#fce8e6',
              border: '1px solid #ea4335',
            }}>
              <AlertCircle size={15} color="#ea4335" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#c5221f', fontWeight: 500 }}>
                {slot.conflict_description || 'Scheduling conflict detected for this slot.'}
              </p>
            </div>
          )}

          {!slot.has_conflict && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              background: '#e6f4ea',
              border: '1px solid #34a853',
              width: 'fit-content',
            }}>
              <CheckCircle size={13} color="#34a853" />
              <span style={{ fontSize: 11, color: '#137333', fontWeight: 600 }}>No conflicts</span>
            </div>
          )}

          {/* Time info */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', marginBottom: 4 }}>
              Schedule
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {DAY_NAMES[slot.day] ?? `Day ${slot.day}`}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {slot.time_slot}
            </p>
          </div>

          {/* Course */}
          {row(
            <BookOpen size={15} />,
            'Course',
            <>
              <span style={{ fontWeight: 700 }}>{slot.subject_name}</span>
              {slot.subject_code && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>
                  {slot.subject_code}
                </span>
              )}
            </>,
          )}

          {/* Teacher */}
          {row(
            <TeacherAvatar name={slot.faculty_name} />,
            'Faculty',
            slot.faculty_name || '—',
          )}

          {/* Room */}
          {row(
            <MapPin size={15} />,
            'Room',
            <>
              {slot.room_number || '—'}
              {slot.room_capacity > 0 && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>
                  (capacity {slot.room_capacity})
                </span>
              )}
            </>,
          )}

          {/* Enrollment */}
          {slot.enrolled_count > 0 && row(
            <Users size={15} />,
            'Enrolled',
            <>
              <span style={{ fontWeight: 700, color: slot.enrolled_count > slot.room_capacity ? '#ea4335' : 'inherit' }}>
                {slot.enrolled_count}
              </span>
              {slot.room_capacity > 0 && (
                <span style={{ color: 'var(--color-text-muted)' }}> / {slot.room_capacity}</span>
              )}
            </>,
          )}

          {/* Section info */}
          {(slot.section || slot.year) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {slot.year && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 4,
                  background: ['#e8f0fe', '#e6f4ea', '#fef7e0', '#fce8e6'][slot.year - 1] || '#f3e8fd',
                  color: ['#1a73e8', '#34a853', '#f9ab00', '#ea4335'][slot.year - 1] || '#9334ea',
                }}>
                  Year {slot.year}
                </span>
              )}
              {slot.section && (
                <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4, background: 'var(--color-bg-surface-2)', color: 'var(--color-text-secondary)' }}>
                  Section {slot.section}
                </span>
              )}
            </div>
          )}

          {/* Batch */}
          {slot.batch_name && row(
            <Users size={15} />,
            'Batch',
            slot.batch_name,
          )}
        </div>
      )}
    </div>
  )
}
