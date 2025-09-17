"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hardcoded users for testing
const MOCK_USERS = {
  admin: { id: 1, username: 'admin', email: 'admin@sih28.com', role: 'admin' as const, password: 'admin123' },
  staff: { id: 2, username: 'staff', email: 'staff@sih28.com', role: 'staff' as const, password: 'staff123' },
  faculty: { id: 3, username: 'faculty', email: 'faculty@sih28.com', role: 'faculty' as const, password: 'faculty123' },
  student: { id: 4, username: 'student', email: 'student@sih28.com', role: 'student' as const, password: 'student123' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    setError(null)
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockUser = Object.values(MOCK_USERS).find(
      u => u.username === username && u.password === password
    )
    
    if (!mockUser) {
      setError('Invalid username or password')
      setIsLoading(false)
      throw new Error('Invalid credentials')
    }
    
    const userWithoutPassword = {
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      role: mockUser.role
    }
    
    setUser(userWithoutPassword)
    localStorage.setItem('user', JSON.stringify(userWithoutPassword))
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    setError(null)
    localStorage.removeItem('user')
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