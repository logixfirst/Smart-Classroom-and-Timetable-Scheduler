export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'faculty' | 'student'
  first_name?: string
  last_name?: string
  organization?: string // organization_id
  department?: string // department_id
  organization_name?: string
  department_name?: string
}
