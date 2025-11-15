'use client'

import { useState, useEffect } from 'react'

interface Classroom {
  id: string
  roomNumber: string
  capacity: number
  type: 'lecture' | 'lab'
}

interface Batch {
  id: string
  name: string
  strength: number
}

interface Subject {
  id: string
  name: string
  code: string
  classesPerWeek: number
}

interface Faculty {
  id: string
  name: string
}

interface FixedSlot {
  id: string
  subject: string
  faculty: string
  day: string
  timeSlot: string
}

export default function TimetableForm() {
  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    academicYear: '2024-25',
    maxClassesPerDay: 6,
  })

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [fixedSlots, setFixedSlots] = useState<FixedSlot[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Smart autofill when department and semester change
  useEffect(() => {
    if (formData.department && formData.semester) {
      loadFilteredData()
    }
  }, [formData.department, formData.semester])

  useEffect(() => {
    loadAllData()
  }, [])

  const loadFilteredData = async () => {
    try {
      const [batchesRes, subjectsRes, facultyRes] = await Promise.all([
        fetch(
          `http://localhost:8000/api/v1/auth/batches/?department=${formData.department}&semester=${formData.semester}`
        ),
        fetch(
          `http://localhost:8000/api/v1/courses/?department=${formData.department}&semester=${formData.semester}`
        ),
        fetch(`http://localhost:8000/api/v1/auth/faculty/?department=${formData.department}`),
      ])

      if (batchesRes.ok) {
        const batchData = await batchesRes.json()
        setBatches(
          batchData.map((b: any) => ({
            id: b.id?.toString() || b.name,
            name: b.name || '',
            strength: b.strength || 0,
          }))
        )
      }

      if (subjectsRes.ok) {
        const subjectData = await subjectsRes.json()
        setSubjects(
          subjectData.map((s: any) => ({
            id: s.id?.toString() || s.code,
            name: s.name || '',
            code: s.code || '',
            classesPerWeek: s.classesPerWeek || s.classes_per_week || 0,
          }))
        )
      }

      if (facultyRes.ok) {
        const facultyData = await facultyRes.json()
        setFaculty(
          facultyData.map((f: any) => ({
            id: f.id?.toString() || f.name,
            name: f.name || '',
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load filtered data:', error)
    }
  }

  const loadAllData = async () => {
    try {
      const classroomsRes = await fetch('http://localhost:8000/api/v1/classrooms/')

      if (classroomsRes.ok) {
        const classroomData = await classroomsRes.json()
        setClassrooms(
          classroomData.map((c: any) => ({
            id: c.id?.toString() || c.roomNumber,
            roomNumber: c.roomNumber || '',
            capacity: c.capacity || 0,
            type: c.type || 'lecture',
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setClassrooms([])
    } finally {
      setIsLoading(false)
    }
  }

  // Classroom functions
  const addClassroom = () => {
    setClassrooms([
      ...classrooms,
      {
        id: Date.now().toString(),
        roomNumber: '',
        capacity: 30,
        type: 'lecture',
      },
    ])
  }

  const updateClassroom = (id: string, field: keyof Classroom, value: any) => {
    setClassrooms(
      classrooms.map(room =>
        room.id === id
          ? {
              ...room,
              [field]: field === 'capacity' ? (value === '' ? 0 : parseInt(value, 10) || 0) : value,
            }
          : room
      )
    )
  }

  const removeClassroom = (id: string) => {
    setClassrooms(classrooms.filter(room => room.id !== id))
  }

  // Batch functions
  const addBatch = () => {
    setBatches([
      ...batches,
      {
        id: Date.now().toString(),
        name: '',
        strength: 60,
      },
    ])
  }

  const updateBatch = (id: string, field: keyof Batch, value: any) => {
    setBatches(
      batches.map(batch =>
        batch.id === id
          ? {
              ...batch,
              [field]: field === 'strength' ? (value === '' ? 0 : parseInt(value, 10) || 0) : value,
            }
          : batch
      )
    )
  }

  const removeBatch = (id: string) => {
    setBatches(batches.filter(batch => batch.id !== id))
  }

  // Subject functions
  const addSubject = () => {
    setSubjects([
      ...subjects,
      {
        id: Date.now().toString(),
        name: '',
        code: '',
        classesPerWeek: 3,
      },
    ])
  }

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
    setSubjects(
      subjects.map(subject =>
        subject.id === id
          ? {
              ...subject,
              [field]:
                field === 'classesPerWeek' ? (value === '' ? 0 : parseInt(value, 10) || 0) : value,
            }
          : subject
      )
    )
  }

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id))
  }

  // Faculty functions
  const addFaculty = () => {
    setFaculty([
      ...faculty,
      {
        id: Date.now().toString(),
        name: '',
      },
    ])
  }

  const updateFaculty = (id: string, field: keyof Faculty, value: string) => {
    setFaculty(faculty.map(member => (member.id === id ? { ...member, [field]: value } : member)))
  }

  const removeFaculty = (id: string) => {
    setFaculty(faculty.filter(member => member.id !== id))
  }

  // Fixed slot functions
  const addFixedSlot = () => {
    setFixedSlots([
      ...fixedSlots,
      {
        id: Date.now().toString(),
        subject: '',
        faculty: '',
        day: '',
        timeSlot: '',
      },
    ])
  }

  const updateFixedSlot = (id: string, field: keyof FixedSlot, value: string) => {
    setFixedSlots(fixedSlots.map(slot => (slot.id === id ? { ...slot, [field]: value } : slot)))
  }

  const removeFixedSlot = (id: string) => {
    setFixedSlots(fixedSlots.filter(slot => slot.id !== id))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)

    // Get enrollment data for NEP integration
    let enrollmentData = []
    try {
      const enrollmentRes = await fetch(
        `http://localhost:8000/api/v1/students/enrollments/summary/?semester=${formData.semester}&academic_year=${formData.academicYear}`
      )
      if (enrollmentRes.ok) {
        enrollmentData = await enrollmentRes.json()
      }
    } catch (error) {
      console.warn('Could not fetch enrollment data:', error)
    }

    const payload = {
      department: formData.department,
      semester: formData.semester,
      academicYear: formData.academicYear,
      maxClassesPerDay: formData.maxClassesPerDay,
      classrooms: classrooms.filter(c => c.roomNumber && c.capacity > 0),
      batches: batches.filter(b => b.name && b.strength > 0),
      subjects: subjects.filter(s => s.name && s.code && s.classesPerWeek > 0),
      faculty: faculty.filter(f => f.name),
      fixedSlots: fixedSlots.filter(s => s.subject && s.faculty && s.day && s.timeSlot),
      enrollments: enrollmentData,
    }

    try {
      // Call Django API which will coordinate with FastAPI
      const response = await fetch('http://localhost:8000/api/v1/timetables/generate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success && result.timetable_id) {
        alert(`Generated ${result.options_count || 3} timetable options successfully!`)
        // Redirect to the review page with the generated timetable ID
        window.location.href = `/admin/timetables/${result.timetable_id}/review`
      } else {
        alert(`Generation failed: ${result.error || 'Unknown error occurred'}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
          Generate Timetable
        </h1>
        <button
          onClick={handleGenerate}
          disabled={
            isGenerating ||
            !formData.department ||
            !formData.semester ||
            classrooms.length === 0 ||
            subjects.length === 0 ||
            faculty.length === 0
          }
          className="btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="loading-spinner w-4 h-4 mr-2"></div>
              Generating Options...
            </>
          ) : (
            <>
              <span className="mr-2">🧠</span>
              Generate Master Timetable
            </>
          )}
        </button>
      </div>

      {/* Basic Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Basic Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="input-primary"
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">Select Department</option>
              <option value="cs">Computer Science</option>
              <option value="math">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester</label>
            <select
              className="input-primary"
              value={formData.semester}
              onChange={e => setFormData({ ...formData, semester: e.target.value })}
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <input
              type="text"
              className="input-primary"
              placeholder="2023-24"
              value={formData.academicYear}
              onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Section 1: Classrooms & Batches */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="card-title">Classrooms & Batches</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={addClassroom} className="btn-secondary w-full sm:w-auto">
                <span className="mr-2">🏫</span>
                Add Classroom
              </button>
              <button onClick={addBatch} className="btn-secondary w-full sm:w-auto">
                <span className="mr-2">👥</span>
                Add Batch
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classrooms */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Classrooms
            </h4>
            <div className="space-y-3">
              {classrooms.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  No classrooms added. Click "Add Classroom" to start.
                </div>
              ) : (
                classrooms.map(room => (
                  <div
                    key={room.id}
                    className="border border-gray-200 dark:border-[#3c4043] rounded-lg p-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="form-group">
                        <label className="form-label text-xs">Room Number</label>
                        <input
                          type="text"
                          className="input-primary text-sm"
                          placeholder="Room 101"
                          value={room.roomNumber}
                          onChange={e => updateClassroom(room.id, 'roomNumber', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Capacity</label>
                        <input
                          type="number"
                          min="1"
                          className="input-primary text-sm"
                          value={room.capacity || ''}
                          onChange={e =>
                            updateClassroom(room.id, 'capacity', parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Type</label>
                        <select
                          className="input-primary text-sm"
                          value={room.type}
                          onChange={e => updateClassroom(room.id, 'type', e.target.value)}
                        >
                          <option value="lecture">Lecture Hall</option>
                          <option value="lab">Lab</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeClassroom(room.id)}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Batches */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Student Batches
            </h4>
            <div className="space-y-3">
              {batches.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  No batches added. Click "Add Batch" to start.
                </div>
              ) : (
                batches.map(batch => (
                  <div
                    key={batch.id}
                    className="border border-gray-200 dark:border-[#3c4043] rounded-lg p-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="form-group">
                        <label className="form-label text-xs">Batch Name</label>
                        <input
                          type="text"
                          className="input-primary text-sm"
                          placeholder="CS-A"
                          value={batch.name}
                          onChange={e => updateBatch(batch.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Strength</label>
                        <input
                          type="number"
                          min="1"
                          className="input-primary text-sm"
                          value={batch.strength || ''}
                          onChange={e =>
                            updateBatch(batch.id, 'strength', parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeBatch(batch.id)}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Subjects & Faculty */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="card-title">Subjects & Faculty</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={addSubject} className="btn-secondary w-full sm:w-auto">
                <span className="mr-2">📚</span>
                Add Subject
              </button>
              <button onClick={addFaculty} className="btn-secondary w-full sm:w-auto">
                <span className="mr-2">👨🏫</span>
                Add Faculty
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subjects */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Subjects</h4>
            <div className="space-y-3">
              {subjects.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  No subjects added. Click "Add Subject" to start.
                </div>
              ) : (
                subjects.map(subject => (
                  <div
                    key={subject.id}
                    className="border border-gray-200 dark:border-[#3c4043] rounded-lg p-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="form-group">
                        <label className="form-label text-xs">Subject Name</label>
                        <input
                          type="text"
                          className="input-primary text-sm"
                          placeholder="Data Structures"
                          value={subject.name}
                          onChange={e => updateSubject(subject.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Subject Code</label>
                        <input
                          type="text"
                          className="input-primary text-sm"
                          placeholder="CS301"
                          value={subject.code}
                          onChange={e => updateSubject(subject.id, 'code', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Classes/Week</label>
                        <input
                          type="number"
                          min="1"
                          className="input-primary text-sm"
                          value={subject.classesPerWeek || ''}
                          onChange={e =>
                            updateSubject(
                              subject.id,
                              'classesPerWeek',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeSubject(subject.id)}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Faculty */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Faculty Members
            </h4>
            <div className="space-y-3">
              {faculty.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  No faculty added. Click "Add Faculty" to start.
                </div>
              ) : (
                faculty.map(member => (
                  <div
                    key={member.id}
                    className="border border-gray-200 dark:border-[#3c4043] rounded-lg p-3"
                  >
                    <div className="grid grid-cols-1 gap-3 mb-3">
                      <div className="form-group">
                        <label className="form-label text-xs">Faculty Name</label>
                        <input
                          type="text"
                          className="input-primary text-sm"
                          placeholder="Dr. John Doe"
                          value={member.name}
                          onChange={e => updateFaculty(member.id, 'name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeFaculty(member.id)}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Constraints */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Constraints</h3>
        </div>

        <div className="space-y-6">
          {/* General Constraints */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              General Constraints
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Maximum Classes per Day</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="input-primary"
                  value={formData.maxClassesPerDay || ''}
                  onChange={e =>
                    setFormData({ ...formData, maxClassesPerDay: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          {/* Fixed Slots */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Fixed Time Slots
              </h4>
              <button onClick={addFixedSlot} className="btn-secondary w-full sm:w-auto">
                <span className="mr-2">📌</span>
                Add Fixed Slot
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Define special classes that must be scheduled at specific times
            </p>

            <div className="space-y-3">
              {fixedSlots.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  No fixed slots defined. Add slots for special classes.
                </div>
              ) : (
                fixedSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="border border-gray-200 dark:border-[#3c4043] rounded-lg p-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <div className="form-group">
                        <label className="form-label text-xs">Subject</label>
                        <select
                          className="input-primary text-sm"
                          value={slot.subject}
                          onChange={e => updateFixedSlot(slot.id, 'subject', e.target.value)}
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(subject => (
                            <option key={subject.id} value={subject.name}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label text-xs">Faculty</label>
                        <select
                          className="input-primary text-sm"
                          value={slot.faculty}
                          onChange={e => updateFixedSlot(slot.id, 'faculty', e.target.value)}
                        >
                          <option value="">Select Faculty</option>
                          {faculty.map(member => (
                            <option key={member.id} value={member.name}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label text-xs">Day</label>
                        <select
                          className="input-primary text-sm"
                          value={slot.day}
                          onChange={e => updateFixedSlot(slot.id, 'day', e.target.value)}
                        >
                          <option value="">Select Day</option>
                          <option value="monday">Monday</option>
                          <option value="tuesday">Tuesday</option>
                          <option value="wednesday">Wednesday</option>
                          <option value="thursday">Thursday</option>
                          <option value="friday">Friday</option>
                          <option value="saturday">Saturday</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label text-xs">Time Slot</label>
                        <select
                          className="input-primary text-sm"
                          value={slot.timeSlot}
                          onChange={e => updateFixedSlot(slot.id, 'timeSlot', e.target.value)}
                        >
                          <option value="">Select Time</option>
                          <option value="9:00-10:00">9:00 - 10:00 AM</option>
                          <option value="10:00-11:00">10:00 - 11:00 AM</option>
                          <option value="11:00-12:00">11:00 - 12:00 PM</option>
                          <option value="12:00-13:00">12:00 - 1:00 PM</option>
                          <option value="14:00-15:00">2:00 - 3:00 PM</option>
                          <option value="15:00-16:00">3:00 - 4:00 PM</option>
                          <option value="16:00-17:00">4:00 - 5:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => removeFixedSlot(slot.id)}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generation Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Generation Summary</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {classrooms.length || 0}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Classrooms</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {batches.length || 0}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Batches</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {subjects.length || 0}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Subjects</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {faculty.length || 0}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Faculty</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {fixedSlots.length || 0}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Fixed Slots</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formData.maxClassesPerDay || 0}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Max Classes/Day</span>
          </div>
        </div>
      </div>
    </div>
  )
}
