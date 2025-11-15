'use client'

import { useState } from 'react'

export default function AcademicYearForm() {
  const [formData, setFormData] = useState({
    academicYear: '2024-25',
    semesterStart: '2024-07-01',
    semesterEnd: '2024-12-15',
    holidays: '',
  })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Academic Year Configuration</h3>
        <p className="card-description">Set academic calendar and dates</p>
      </div>

      <form className="space-y-4">
        <div className="form-group">
          <label htmlFor="academic-year" className="form-label">
            Academic Year
          </label>
          <input
            id="academic-year"
            type="text"
            className="input-primary"
            value={formData.academicYear}
            onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="semester-start" className="form-label">
              Semester Start
            </label>
            <input
              id="semester-start"
              type="date"
              className="input-primary"
              value={formData.semesterStart}
              onChange={e => setFormData({ ...formData, semesterStart: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="semester-end" className="form-label">
              Semester End
            </label>
            <input
              id="semester-end"
              type="date"
              className="input-primary"
              value={formData.semesterEnd}
              onChange={e => setFormData({ ...formData, semesterEnd: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="holidays" className="form-label">
            Holiday List
          </label>
          <textarea
            id="holidays"
            className="input-primary min-h-20"
            placeholder="Enter holidays (one per line)"
            value={formData.holidays}
            onChange={e => setFormData({ ...formData, holidays: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Save Configuration
        </button>
      </form>
    </div>
  )
}
