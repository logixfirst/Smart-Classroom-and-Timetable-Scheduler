'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  CalendarDays,
  Users,
  GraduationCap,
  ShieldCheck,
  School,
  Building2,
  BookCopy,
} from 'lucide-react'

/**
 * NewMenu — the "+ New" admin-only dropdown in the header.
 * Self-contained: manages its own open/close state with outside-click handling.
 */
export default function NewMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 pl-3 pr-4 rounded-full text-sm font-medium bg-white dark:bg-[#303134] border border-[#dadce0] dark:border-[#5f6368] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] shadow-sm transition-colors select-none"
      >
        <Plus size={18} strokeWidth={2} className="text-[#1A73E8]" />
        <span className="hidden sm:inline">New</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-[220px] rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.16)] bg-white dark:bg-[#292a2d] border border-[#e0e0e0] dark:border-[#3c4043] overflow-hidden z-[60] py-2">

          {/* Section: Timetable */}
          <p className="px-4 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#80868b]">
            Timetable
          </p>
          <Link
            href="/admin/timetables/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <CalendarDays size={16} className="text-[#1A73E8] shrink-0" />
            Generate Timetable
          </Link>

          <div className="my-1.5 mx-4 h-px bg-[#e0e0e0] dark:bg-[#3c4043]" />

          {/* Section: People */}
          <p className="px-4 pt-0.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#80868b]">
            People
          </p>
          <Link
            href="/admin/faculty"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <Users size={16} className="text-[#34A853] shrink-0" />
            Add Faculty
          </Link>
          <Link
            href="/admin/students"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <GraduationCap size={16} className="text-[#34A853] shrink-0" />
            Add Student
          </Link>
          <Link
            href="/admin/admins"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <ShieldCheck size={16} className="text-[#34A853] shrink-0" />
            Add Admin
          </Link>

          <div className="my-1.5 mx-4 h-px bg-[#e0e0e0] dark:bg-[#3c4043]" />

          {/* Section: Academic */}
          <p className="px-4 pt-0.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#80868b]">
            Academic
          </p>
          <Link
            href="/admin/academic/schools"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <School size={16} className="text-[#FBBC04] shrink-0" />
            Add School
          </Link>
          <Link
            href="/admin/academic/buildings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <Building2 size={16} className="text-[#FBBC04] shrink-0" />
            Add Building
          </Link>
          <Link
            href="/admin/academic/courses"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            <BookCopy size={16} className="text-[#FBBC04] shrink-0" />
            Add Course
          </Link>
        </div>
      )}
    </div>
  )
}
