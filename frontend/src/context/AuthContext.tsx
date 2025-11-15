'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import apiClient from '@/lib/api'

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const token = localStorage.getItem('auth_token')

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser))
        apiClient.setToken(token)
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('auth_token')
      }
    }
    setIsLoading(false)
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

      const { token, user: userData } = response.data

      // Set token in API client and localStorage
      apiClient.setToken(token)
      localStorage.setItem('auth_token', token)

      // Store user data
      const userWithoutPassword = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      }

      setUser(userWithoutPassword)
      localStorage.setItem('user', JSON.stringify(userWithoutPassword))
      setIsLoading(false)
    } catch (err) {
      setIsLoading(false)
      throw err
    }
  }

  const logout = () => {
    setUser(null)
    setError(null)
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
    apiClient.setToken(null)
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
