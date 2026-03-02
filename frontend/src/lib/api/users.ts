import { apiClient } from './client'

function pageParams(page: number, pageSize: number, search: string): string {
  const p = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  })
  return p.toString()
}

export const usersApi = {
  getUsers: (page = 1, pageSize = 25, search = '') =>
    apiClient.request<unknown>(`/users/?${pageParams(page, pageSize, search)}`),

  getUser: (id: string) =>
    apiClient.request<unknown>(`/users/${id}/`),

  createUser: (data: unknown) =>
    apiClient.request<unknown>('/users/', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: unknown) =>
    apiClient.request<unknown>(`/users/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id: string) =>
    apiClient.request<unknown>(`/users/${id}/`, { method: 'DELETE' }),
}
