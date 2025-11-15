'use client'

import DashboardLayout from '@/components/dashboard-layout'

export default function StudentEnrollments() {
  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Course Enrollments
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage your course registrations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn-secondary flex-1 sm:flex-none">
              <span className="mr-2">🔍</span>
              Check Clashes
            </button>
            <button className="btn-primary flex-1 sm:flex-none">
              <span className="mr-2">➕</span>
              Add Course
            </button>
          </div>
        </div>

        {/* Current Enrollments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Enrollments - Semester 5</h3>
            <p className="card-description">24 Credits Total</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Course Name</th>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Faculty</th>
                  <th className="table-header-cell">Credits</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: 'Data Structures',
                    code: 'CS301',
                    credits: 4,
                    faculty: 'Dr. Rajesh Kumar',
                    type: 'Core',
                    status: 'Enrolled',
                  },
                  {
                    name: 'Database Systems',
                    code: 'CS302',
                    credits: 4,
                    faculty: 'Prof. Meera Sharma',
                    type: 'Core',
                    status: 'Enrolled',
                  },
                  {
                    name: 'Software Engineering',
                    code: 'CS303',
                    credits: 4,
                    faculty: 'Dr. Vikram Gupta',
                    type: 'Core',
                    status: 'Enrolled',
                  },
                  {
                    name: 'Machine Learning',
                    code: 'CS401',
                    credits: 4,
                    faculty: 'Dr. Anita Verma',
                    type: 'Elective',
                    status: 'Enrolled',
                  },
                  {
                    name: 'Web Development',
                    code: 'CS402',
                    credits: 4,
                    faculty: 'Prof. Suresh Reddy',
                    type: 'Elective',
                    status: 'Enrolled',
                  },
                  {
                    name: 'Technical Writing',
                    code: 'EN301',
                    credits: 4,
                    faculty: 'Dr. Kavita Joshi',
                    type: 'General',
                    status: 'Enrolled',
                  },
                ].map((course, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{course.name}</td>
                    <td className="table-cell border-b border-gray-200 dark:border-gray-600">
                      {course.code}
                    </td>
                    <td className="table-cell border-b border-gray-200 dark:border-gray-600">
                      {course.faculty}
                    </td>
                    <td className="table-cell">{course.credits}</td>
                    <td className="table-cell">
                      <span
                        className={`badge text-xs ${
                          course.type === 'Core'
                            ? 'badge-success'
                            : course.type === 'Elective'
                              ? 'badge-warning'
                              : 'badge-neutral'
                        }`}
                      >
                        {course.type}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-success text-xs">{course.status}</span>
                    </td>
                    <td className="table-cell">
                      <button className="btn-ghost text-xs px-2 py-1">Drop</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Courses */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Available Courses</h3>
            <p className="card-description">Courses you can enroll in</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Course Name</th>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Faculty</th>
                  <th className="table-header-cell">Credits</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Seats</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: 'Mobile App Development',
                    code: 'CS403',
                    credits: 4,
                    faculty: 'Prof. Amit Sharma',
                    type: 'Elective',
                    seats: '5/40',
                  },
                  {
                    name: 'Artificial Intelligence',
                    code: 'CS404',
                    credits: 4,
                    faculty: 'Dr. Neha Gupta',
                    type: 'Elective',
                    seats: '12/40',
                  },
                  {
                    name: 'Cyber Security',
                    code: 'CS405',
                    credits: 4,
                    faculty: 'Prof. Rohit Verma',
                    type: 'Elective',
                    seats: 'Full',
                  },
                ].map((course, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{course.name}</td>
                    <td className="table-cell border-b border-gray-200 dark:border-gray-600">
                      {course.code}
                    </td>
                    <td className="table-cell border-b border-gray-200 dark:border-gray-600">
                      {course.faculty}
                    </td>
                    <td className="table-cell">{course.credits}</td>
                    <td className="table-cell">
                      <span className="badge badge-warning text-xs">{course.type}</span>
                    </td>
                    <td className="table-cell">{course.seats}</td>
                    <td className="table-cell">
                      <button
                        className={`btn-primary text-xs px-2 py-1 ${course.seats === 'Full' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={course.seats === 'Full'}
                      >
                        {course.seats === 'Full' ? 'Full' : 'Enroll'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
