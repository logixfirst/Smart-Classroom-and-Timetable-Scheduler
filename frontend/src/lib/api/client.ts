// 🔐 API Client — Django Backend with Secure HttpOnly Cookie Authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

/**
 * Extends RequestInit with internal flags consumed by ApiClient.request() that
 * must never be forwarded to fetch().
 */
interface InternalRequestOptions extends RequestInit {
  /**
   * When true, suppresses the automatic redirect to /login on 401.
   * Use for silent auth-probes where an unauthenticated response is expected.
   */
  noRedirectOn401?: boolean
}

export class ApiClient {
  readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      // 🔐 NO Authorization header — JWT tokens live in secure HttpOnly cookies.
      // Backend reads from cookies automatically (Google-like security pattern).
    }
  }

  /**
   * 🔐 CRITICAL: credentials: 'include' sends HttpOnly cookies with every request.
   */
  async request<T>(endpoint: string, options?: InternalRequestOptions): Promise<ApiResponse<T>> {
    const { noRedirectOn401 = false, ...fetchOptions } = options ?? {}
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        credentials: 'include', // 🔐 CRITICAL: send cookies
        headers: {
          ...this.getHeaders(),
          ...fetchOptions?.headers,
        },
      })

      // Handle 401 Unauthorized — try to refresh token
      if (
        response.status === 401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh')
      ) {
        // For silent auth-probes, skip refresh — a 401 means no active session.
        if (!noRedirectOn401) {
          const refreshed = await this.refreshToken()
          if (refreshed) {
            return this.request<T>(endpoint, options)
          }
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login'
          }
        }
      }

      let data
      try {
        data = await response.json()
      } catch {
        return {
          data: undefined,
          error: response.ok ? undefined : `Server error (${response.status}): ${response.statusText}`,
          status: response.status,
        }
      }

      return {
        data: response.ok ? data : undefined,
        error: !response.ok ? (data.detail || data.error || 'Request failed') : undefined,
        status: response.status,
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      }
    }
  }

  /**
   * 🔐 Refresh JWT access token using refresh token from HttpOnly cookie.
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
      })
      return response.ok
    } catch {
      return false
    }
  }
}

/** Singleton API client shared by all domain modules. */
export const apiClient = new ApiClient(API_BASE_URL)
