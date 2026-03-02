import { z } from 'zod'

export const userRoles = ['admin', 'faculty', 'student'] as const

export const userSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(150, 'Username must not exceed 150 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address').max(254, 'Email must not exceed 254 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character')
    .optional(),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(150, 'First name must not exceed 150 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(150, 'Last name must not exceed 150 characters'),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  department: z.string().min(1, 'Department is required').optional(),
  is_active: z.boolean().default(true),
})

export type UserFormData = z.infer<typeof userSchema>
