import { apiClient } from './client'

function pageParams(page: number, pageSize: number, search: string): string {
  const p = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  })
  return p.toString()
}

export const studentsApi = {
  getStudents: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/students/?${pageParams(page, pageSize, search)}`),

  getStudent: (id: string) =>
    apiClient.request<unknown>(`/students/${id}/`),

  createStudent: (data: unknown) =>
    apiClient.request<unknown>('/students/', { method: 'POST', body: JSON.stringify(data) }),

  updateStudent: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/students/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteStudent: (id: string) =>
    apiClient.request<unknown>(`/students/${id}/`, { method: 'DELETE' }),
}
