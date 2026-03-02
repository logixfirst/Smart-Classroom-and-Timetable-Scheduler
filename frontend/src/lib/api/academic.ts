import { apiClient } from './client'

function pageParams(page: number, pageSize: number, search: string): string {
  const p = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  })
  return p.toString()
}

export const academicApi = {
  // Departments
  getDepartments: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/departments/?${pageParams(page, pageSize, search)}`),
  getDepartment: (id: string) => apiClient.request<unknown>(`/departments/${id}/`),
  createDepartment: (data: unknown) =>
    apiClient.request<unknown>('/departments/', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/departments/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) =>
    apiClient.request<unknown>(`/departments/${id}/`, { method: 'DELETE' }),

  // Buildings
  getBuildings: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/buildings/?${pageParams(page, pageSize, search)}`),
  getBuilding: (id: string) => apiClient.request<unknown>(`/buildings/${id}/`),
  createBuilding: (data: unknown) =>
    apiClient.request<unknown>('/buildings/', { method: 'POST', body: JSON.stringify(data) }),
  updateBuilding: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/buildings/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBuilding: (id: string) =>
    apiClient.request<unknown>(`/buildings/${id}/`, { method: 'DELETE' }),

  // Schools
  getSchools: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/schools/?${pageParams(page, pageSize, search)}`),
  getSchool: (id: string) => apiClient.request<unknown>(`/schools/${id}/`),
  createSchool: (data: unknown) =>
    apiClient.request<unknown>('/schools/', { method: 'POST', body: JSON.stringify(data) }),
  updateSchool: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/schools/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchool: (id: string) =>
    apiClient.request<unknown>(`/schools/${id}/`, { method: 'DELETE' }),

  // Programs
  getPrograms: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/programs/?${pageParams(page, pageSize, search)}`),
  getProgram: (id: string) => apiClient.request<unknown>(`/programs/${id}/`),
  createProgram: (data: unknown) =>
    apiClient.request<unknown>('/programs/', { method: 'POST', body: JSON.stringify(data) }),
  updateProgram: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/programs/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProgram: (id: string) =>
    apiClient.request<unknown>(`/programs/${id}/`, { method: 'DELETE' }),

  // Courses
  getCourses: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/courses/?${pageParams(page, pageSize, search)}`),
  getCourse: (id: string) => apiClient.request<unknown>(`/courses/${id}/`),
  createCourse: (data: unknown) =>
    apiClient.request<unknown>('/courses/', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/courses/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id: string) =>
    apiClient.request<unknown>(`/courses/${id}/`, { method: 'DELETE' }),

  // Rooms
  getRooms: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/rooms/?${pageParams(page, pageSize, search)}`),
  getRoom: (id: string) => apiClient.request<unknown>(`/rooms/${id}/`),
  createRoom: (data: unknown) =>
    apiClient.request<unknown>('/rooms/', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/rooms/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: string) =>
    apiClient.request<unknown>(`/rooms/${id}/`, { method: 'DELETE' }),

  // Labs
  getLabs: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/labs/?${pageParams(page, pageSize, search)}`),
  getLab: (id: string) => apiClient.request<unknown>(`/labs/${id}/`),
  createLab: (data: unknown) =>
    apiClient.request<unknown>('/labs/', { method: 'POST', body: JSON.stringify(data) }),
  updateLab: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/labs/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLab: (id: string) =>
    apiClient.request<unknown>(`/labs/${id}/`, { method: 'DELETE' }),

  // Subjects
  getSubjects: () => apiClient.request<unknown>('/subjects/'),
  getSubject: (id: string) => apiClient.request<unknown>(`/subjects/${id}/`),
}
