import { z } from 'zod'

export const timetableGenerationSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Timetable name must be at least 3 characters')
      .max(200, 'Timetable name must not exceed 200 characters'),
    department_ids: z
      .array(z.string())
      .min(1, 'At least one department must be selected')
      .max(20, 'Cannot select more than 20 departments'),
    course_ids: z
      .array(z.string())
      .min(1, 'At least one course must be selected')
      .max(20, 'Cannot select more than 20 courses'),
    start_date: z
      .string()
      .min(1, 'Start date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    end_date: z
      .string()
      .min(1, 'End date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    working_days: z
      .array(z.number().min(0).max(6))
      .min(1, 'At least one working day must be selected')
      .max(7, 'Cannot have more than 7 working days'),
    slots_per_day: z
      .number()
      .min(4, 'Must have at least 4 slots per day')
      .max(12, 'Cannot exceed 12 slots per day')
      .int('Slots per day must be a whole number'),
    optimization_level: z
      .enum(['basic', 'advanced', 'optimal'], {
        errorMap: () => ({ message: 'Please select a valid optimization level' }),
      })
      .default('advanced'),
  })
  .refine(data => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  })

export type TimetableGenerationData = z.infer<typeof timetableGenerationSchema>
/** @deprecated use TimetableGenerationData */
export type TimetableGenerationFormData = TimetableGenerationData
