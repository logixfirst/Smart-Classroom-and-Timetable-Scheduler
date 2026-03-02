import { apiClient } from './client'

function pageParams(page: number, pageSize: number, search: string): string {
  const p = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  })
  return p.toString()
}

export const facultyApi = {
  getFaculty: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/faculty/?${pageParams(page, pageSize, search)}`),

  getFacultyMember: (id: string) =>
    apiClient.request<unknown>(`/faculty/${id}/`),

  createFaculty: (data: unknown) =>
    apiClient.request<unknown>('/faculty/', { method: 'POST', body: JSON.stringify(data) }),

  updateFaculty: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/faculty/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteFaculty: (id: string) =>
    apiClient.request<unknown>(`/faculty/${id}/`, { method: 'DELETE' }),
}
