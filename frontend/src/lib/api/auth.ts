import { apiClient } from './client'

interface LoginCredentials {
  username: string
  password: string
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.request<{ message: string; user: unknown }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    apiClient.request<{ message: string }>('/auth/logout/', { method: 'POST' }),

  /**
   * Silent probe — noRedirectOn401 prevents a redirect when there is no session.
   * AuthContext calls this on every mount; a 401 simply means "not logged in".
   */
  getCurrentUser: () =>
    apiClient.request<unknown>('/auth/me/', { noRedirectOn401: true }),
}
