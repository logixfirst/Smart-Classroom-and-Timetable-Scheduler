// Barrel — re-exports all validation schemas and types
export * from './auth'
export * from './user'
export * from './faculty'
export * from './student'
export * from './timetable'
export * from './academic'

// ─── Validation utility functions ─────────────────────────────────────────────

import { z } from 'zod'

export function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || 'Validation error'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.errors.forEach(err => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return errors
}
