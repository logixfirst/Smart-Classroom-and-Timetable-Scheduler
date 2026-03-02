import React from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2,
  FileText,
  Calendar,
  SlidersHorizontal,
  ShieldCheck,
  Bell,
  School,
  Building2,
  BookCopy,
  Layers,
  GanttChart,
  DoorOpen,
} from 'lucide-react'

// ─── Shared nav types ─────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: boolean
  activeBase?: string
}

export interface NavGroup {
  label: string
  icon: React.ElementType
  /** Pathname prefix used for active detection */
  base: string
  children: NavItem[]
}

export type NavEntry = NavItem | NavGroup

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

// ─── Nav definitions ──────────────────────────────────────────────────────────

export const ADMIN_NAV: NavEntry[] = [
  { label: 'Dashboard',  href: '/admin/dashboard',  icon: LayoutDashboard },
  { label: 'Admins',     href: '/admin/admins',     icon: ShieldCheck },
  { label: 'Faculty',    href: '/admin/faculty',    icon: Users },
  { label: 'Students',   href: '/admin/students',   icon: GraduationCap },
  {
    label: 'Academic',
    icon: BookOpen,
    base: '/admin/academic',
    children: [
      { label: 'Schools',     href: '/admin/academic/schools',     icon: School },
      { label: 'Departments', href: '/admin/academic/departments', icon: Layers },
      { label: 'Buildings',   href: '/admin/academic/buildings',   icon: Building2 },
      { label: 'Programs',    href: '/admin/academic/programs',    icon: GanttChart },
      { label: 'Courses',     href: '/admin/academic/courses',     icon: BookCopy },
      { label: 'Rooms',       href: '/admin/academic/rooms',       icon: DoorOpen },
    ],
  },
  { label: 'Timetables', href: '/admin/timetables', icon: CalendarDays },
  { label: 'Approvals',  href: '/admin/approvals',  icon: CheckCircle2, badge: true },
  { label: 'Logs',       href: '/admin/logs',       icon: FileText },
]

export const FACULTY_NAV: NavItem[] = [
  { label: 'Dashboard',     href: '/faculty/dashboard',     icon: LayoutDashboard },
  { label: 'My Schedule',   href: '/faculty/schedule',      icon: Calendar },
  { label: 'Preferences',   href: '/faculty/preferences',   icon: SlidersHorizontal },
  { label: 'Notifications', href: '/faculty/notifications', icon: Bell },
]

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Timetable', href: '/student/timetable', icon: CalendarDays },
]

const NAV_MAP: Record<string, NavEntry[]> = {
  admin:   ADMIN_NAV,
  faculty: FACULTY_NAV,
  student: STUDENT_NAV,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNavItems(role: 'admin' | 'faculty' | 'student'): NavEntry[] {
  return NAV_MAP[role] ?? ADMIN_NAV
}
