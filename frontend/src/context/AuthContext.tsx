'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { User } from '@/types'
import apiClient from '@/lib/api'

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // ── Synchronously read localStorage so first render already has user data.
  // This prevents a blank-screen flash on the login page while the API probe
  // is in-flight. The probe still runs to verify the session is still valid.
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('user')
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })
  // If we already have cached user data we know they're (likely) authenticated,
  // so skip showing "loading" on the first paint.
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Prevents React 18 StrictMode from firing the auth probe twice.
  // StrictMode mounts → unmounts → remounts in dev; the ref persists across
  // remounts so the second invocation is a no-op and no duplicate request
  // hits the backend.
  const authChecked = useRef(false)

  useEffect(() => {
    if (authChecked.current) return
    authChecked.current = true

    const checkAuth = async () => {
      try {
        const response = await apiClient.getCurrentUser()
        if (response.data) {
          // Refresh user data from server (roles / profile may have changed)
          setUser(response.data)
          localStorage.setItem('user', JSON.stringify(response.data))
        } else {
          // Server says no valid session — clear any stale cached data
          setUser(null)
          localStorage.removeItem('user')
        }
      } catch {
        // Network error or 401 — treat as unauthenticated
        setUser(null)
        localStorage.removeItem('user')
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiClient.login({ username, password })

      if (response.error || !response.data) {
        setError(response.error || 'Login failed')
        setIsLoading(false)
        throw new Error(response.error || 'Invalid credentials')
      }

      // 🔐 JWT tokens are set in HttpOnly cookies by backend
      // We only store user data (no tokens in frontend!)
      const userData = response.data.user

      const userWithoutPassword = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        department: userData.department,
        organization: userData.organization,
      }

      setUser(userWithoutPassword)
      // Store user info in localStorage (not sensitive, just for UI)
      localStorage.setItem('user', JSON.stringify(userWithoutPassword))
      setIsLoading(false)
    } catch (err) {
      setIsLoading(false)
      throw err
    }
  }

  const logout = async () => {
    try {
      // Call backend logout to blacklist refresh token
      await apiClient.logout()
    } catch {
      // Logout anyway even if backend call fails
    } finally {
      setUser(null)
      setError(null)
      localStorage.removeItem('user')
      // Cookies are deleted by backend
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
