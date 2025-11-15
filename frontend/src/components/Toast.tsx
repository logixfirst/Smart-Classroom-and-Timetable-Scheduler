'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (type: ToastType, message: string, duration?: number) => void
  showSuccessToast: (message: string, duration?: number) => void
  showErrorToast: (message: string, duration?: number) => void
  showWarningToast: (message: string, duration?: number) => void
  showInfoToast: (message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: Toast = { id, type, message, duration }

    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccessToast = useCallback(
    (message: string, duration?: number) => {
      showToast('success', message, duration)
    },
    [showToast]
  )

  const showErrorToast = useCallback(
    (message: string, duration?: number) => {
      showToast('error', message, duration)
    },
    [showToast]
  )

  const showWarningToast = useCallback(
    (message: string, duration?: number) => {
      showToast('warning', message, duration)
    },
    [showToast]
  )

  const showInfoToast = useCallback(
    (message: string, duration?: number) => {
      showToast('info', message, duration)
    },
    [showToast]
  )

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccessToast,
        showErrorToast,
        showWarningToast,
        showInfoToast,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[]
  removeToast: (id: string) => void
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in ${bgColors[toast.type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <p className="flex-1 text-sm text-gray-800 font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Helper hooks for specific toast types
export function useSuccessToast() {
  const { showToast } = useToast()
  return useCallback(
    (message: string, duration?: number) => {
      showToast('success', message, duration)
    },
    [showToast]
  )
}

export function useErrorToast() {
  const { showToast } = useToast()
  return useCallback(
    (message: string, duration?: number) => {
      showToast('error', message, duration)
    },
    [showToast]
  )
}

export function useWarningToast() {
  const { showToast } = useToast()
  return useCallback(
    (message: string, duration?: number) => {
      showToast('warning', message, duration)
    },
    [showToast]
  )
}

export function useInfoToast() {
  const { showToast } = useToast()
  return useCallback(
    (message: string, duration?: number) => {
      showToast('info', message, duration)
    },
    [showToast]
  )
}
