/**
 * Barrel export for the new domain-split API modules.
 *
 * Import strategy:
 * - Old code: `import apiClient from '@/lib/api'` still resolves to the legacy
 *   monolithic api.ts (TypeScript file-before-directory resolution).
 * - New code: `import { facultyApi } from '@/lib/api/index'` or individual
 *   domain files like `import { usersApi } from '@/lib/api/users'`.
 * - The `apiClient` singleton from this barrel is from the new client.ts and
 *   is shared by all new domain modules in this directory.
 */

// Core client (singleton)
export { apiClient, ApiClient } from './client'
export type { ApiResponse } from './client'

// Domain-split API objects
export { authApi }       from './auth'
export { usersApi }      from './users'
export { facultyApi }    from './faculty'
export { studentsApi }   from './students'
export { academicApi }   from './academic'

// Timetable domain (kept in timetable.ts + timetable-variants.ts)
export { fetchGenerationJobStatus } from './timetable'
export {
  fetchVariants,
  compareVariants,
  pickVariant,
  fetchDepartmentNames,
} from './timetable-variants'
