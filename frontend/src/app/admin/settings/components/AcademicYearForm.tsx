"use client"

import { useState } from 'react'

export default function AcademicYearForm() {
  const [formData, setFormData] = useState({
    academicYear: '2024-25',
    semesterStart: '2024-07-01',
    semesterEnd: '2024-12-15',
    holidays: ''
  })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Academic Year Configuration</h3>
        <p className="card-description">Set academic calendar and dates</p>
      </div>
      
      <form className="space-y-4">
        <div className="form-group">
          <label className="block text-sm font-medium text-slate-300">Academic Year</label>
          <input 
            type="text" 
            className="input-primary text-sm sm:text-base"
            value={formData.academicYear}
            onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-slate-300">Semester Start</label>
            <input 
              type="date" 
              className="input-primary text-sm sm:text-base"
              value={formData.semesterStart}
              onChange={(e) => setFormData({...formData, semesterStart: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-slate-300">Semester End</label>
            <input 
              type="date" 
              className="input-primary text-sm sm:text-base"
              value={formData.semesterEnd}
              onChange={(e) => setFormData({...formData, semesterEnd: e.target.value})}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium text-slate-300">Holiday List</label>
          <textarea 
            className="input-primary min-h-16 sm:min-h-20 text-sm sm:text-base"
            placeholder="Enter holidays (one per line)"
            value={formData.holidays}
            onChange={(e) => setFormData({...formData, holidays: e.target.value})}
          />
        </div>
        
        <button type="submit" className="btn-primary w-full text-sm sm:text-base py-2.5 sm:py-3">
          Save Configuration
        </button>
      </form>
    </div>
  )
}