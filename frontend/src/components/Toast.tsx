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
    // Google Material 3 snackbar: top-right, 16px inset, 8px gap between stacked toasts
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end w-[min(400px,calc(100vw-32px))]">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  // Google Material 3 «filled tonal» notification tokens
  const config = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      iconCls: 'text-[#0d652d]',
      bar: 'bg-[#0d652d]',
      bg: 'bg-white dark:bg-[#2d2d2d]',
      border: 'border-[#e0e0e0] dark:border-[#3c4043]',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      iconCls: 'text-[#c5221f]',
      bar: 'bg-[#c5221f]',
      bg: 'bg-white dark:bg-[#2d2d2d]',
      border: 'border-[#e0e0e0] dark:border-[#3c4043]',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      iconCls: 'text-[#b06000]',
      bar: 'bg-[#b06000]',
      bg: 'bg-white dark:bg-[#2d2d2d]',
      border: 'border-[#e0e0e0] dark:border-[#3c4043]',
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      iconCls: 'text-[#1a73e8]',
      bar: 'bg-[#1a73e8]',
      bg: 'bg-white dark:bg-[#2d2d2d]',
      border: 'border-[#e0e0e0] dark:border-[#3c4043]',
    },
  }

  const c = config[toast.type]

  return (
    <div
      className={`
        relative flex items-center gap-3 w-full
        pl-4 pr-3 py-3.5
        rounded-[12px] border shadow-[0_1px_3px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.10)]
        ${c.bg} ${c.border}
        animate-[slideInRight_0.2s_ease-out]
      `}
    >
      {/* Left colour bar */}
      <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${c.bar}`} />
      {/* Icon */}
      <span className={`shrink-0 ml-2 ${c.iconCls}`}>{c.icon}</span>
      {/* Message */}
      <p className="flex-1 text-[14px] font-medium text-[#202124] dark:text-[#e8eaed] leading-snug">
        {toast.message}
      </p>
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 p-1 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
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
