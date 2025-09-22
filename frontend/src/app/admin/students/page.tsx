'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard-layout'

interface Student {
  id: number
  student_id: string
  student_name: string
  department: string
  course: string
  elective_chosen: string
  year: number
  semester: number
  faculty_assigned: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  useEffect(() => {
    // Set static mock students instead of API call
    const mockStudents = [
      { 
        id: 1, 
        student_id: 'STU001', 
        student_name: 'Rahul Sharma', 
        department: 'Computer Science', 
        course: 'B.Tech CSE', 
        elective_chosen: 'Machine Learning', 
        year: 2, 
        semester: 4, 
        faculty_assigned: 'Dr. Rajesh Kumar' 
      },
      { 
        id: 2, 
        student_id: 'STU002', 
        student_name: 'Priya Patel', 
        department: 'Computer Science', 
        course: 'B.Tech CSE', 
        elective_chosen: 'Web Development', 
        year: 3, 
        semester: 5, 
        faculty_assigned: 'Dr. Priya Sharma' 
      },
      { 
        id: 3, 
        student_id: 'STU003', 
        student_name: 'Arjun Singh', 
        department: 'Mathematics', 
        course: 'B.Sc Math', 
        elective_chosen: 'Statistics', 
        year: 1, 
        semester: 2, 
        faculty_assigned: 'Prof. Amit Singh' 
      }
    ]
    setStudents(mockStudents)
    setIsLoading(false)
  }, [])

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || student.department === selectedDepartment
    const matchesYear = !selectedYear || student.year.toString() === selectedYear
    return matchesSearch && matchesDepartment && matchesYear
  })

  const departments = [...new Set(students.map(s => s.department))].filter(Boolean)
  const years = [...new Set(students.map(s => s.year))].sort((a, b) => a - b)

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading students...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Student Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {filteredStudents.length} students
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Students</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1">
                <label htmlFor="student-search" className="sr-only">Search students</label>
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  id="student-search"
                  placeholder="Search students..." 
                  className="input-primary pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <label htmlFor="department-filter" className="sr-only">Filter by department</label>
                <select 
                  id="department-filter"
                  className="input-primary w-full sm:w-36"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <label htmlFor="year-filter" className="sr-only">Filter by year</label>
                <select 
                  id="year-filter"
                  className="input-primary w-full sm:w-32"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl sm:text-6xl mb-4">🎓</div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                No Students Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {students.length === 0 ? 'No student data has been imported yet.' : 'No students match your search criteria.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="interactive-element p-4 border border-gray-200 dark:border-[#3c4043]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">{student.student_name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{student.student_id}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{student.course}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="badge badge-neutral text-xs">{student.department}</span>
                        <span className="badge badge-info text-xs">Year {student.year}</span>
                        <span className="badge badge-success text-xs">Sem {student.semester}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p><strong>Electives:</strong> {student.elective_chosen}</p>
                        <p><strong>Faculty:</strong> {student.faculty_assigned}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Student ID</th>
                      <th className="table-header-cell">Name</th>
                      <th className="table-header-cell">Department</th>
                      <th className="table-header-cell">Course</th>
                      <th className="table-header-cell">Year</th>
                      <th className="table-header-cell">Semester</th>
                      <th className="table-header-cell">Electives</th>
                      <th className="table-header-cell">Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-mono text-sm">{student.student_id}</span>
                        </td>
                        <td className="table-cell">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{student.student_name}</div>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-neutral text-xs">{student.department}</span>
                        </td>
                        <td className="table-cell">{student.course}</td>
                        <td className="table-cell">
                          <span className="badge badge-info text-xs">Year {student.year}</span>
                        </td>
                        <td className="table-cell">
                          <span className="badge badge-success text-xs">Sem {student.semester}</span>
                        </td>
                        <td className="table-cell">
                          <div className="max-w-xs truncate" title={student.elective_chosen}>
                            {student.elective_chosen}
                          </div>
                        </td>
                        <td className="table-cell">{student.faculty_assigned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}