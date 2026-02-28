// 🔐 API Client for Django Backend with Secure HttpOnly Cookie Authentication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface LoginCredentials {
  username: string;
  password: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Extends the standard RequestInit with internal flags that are consumed by
 * ApiClient.request() and must never be forwarded to fetch().
 */
interface InternalRequestOptions extends RequestInit {
  /**
   * When true, suppresses the automatic redirect to /login on 401.
   * Use this for silent auth-probes (e.g. getCurrentUser on mount) where
   * an unauthenticated response is expected and handled by the caller.
   */
  noRedirectOn401?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      // 🔐 NO Authorization header - JWT tokens in secure HttpOnly cookies
      // Backend reads from cookies automatically (Google-like security)
    };
  }

  /**
   * 🔐 CRITICAL: credentials: 'include' sends HttpOnly cookies with every request
   * This is required for secure JWT authentication
   */
  async request<T>(endpoint: string, options?: InternalRequestOptions): Promise<ApiResponse<T>> {
    const { noRedirectOn401 = false, ...fetchOptions } = options ?? {};
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        credentials: 'include',  // 🔐 CRITICAL: Send cookies with request
        headers: {
          ...this.getHeaders(),
          ...fetchOptions?.headers,
        },
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request after refresh (preserve original options).
          return this.request<T>(endpoint, options);
        }
        // Refresh failed — redirect to login only when:
        //   1. This is not a silent auth-probe (noRedirectOn401 is false), AND
        //   2. We are not already on an auth page (guard against redirect loops).
        // NOTE: useRouter() is a React hook and MUST NOT be called outside a
        // component. Use window.location for imperative redirects from class methods.
        if (
          !noRedirectOn401 &&
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login')
        ) {
          window.location.href = '/login';
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If response is not JSON (e.g., HTML error page), handle it
        const text = await response.text();
        return {
          data: undefined,
          error: response.ok ? undefined : `Server error (${response.status}): ${response.statusText}`,
          status: response.status,
        };
      }

      return {
        data: response.ok ? data : undefined,
        error: !response.ok ? data.detail || data.error || 'Request failed' : undefined,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  /**
   * 🔐 Refresh JWT access token using refresh token from HttpOnly cookie
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',  // 🔐 CRITICAL: Send refresh token cookie
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Authentication
  async login(credentials: LoginCredentials) {
    return this.request<{ message: string; user: any }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout/', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    // noRedirectOn401: true — this is a silent probe called by AuthContext on
    // every page mount. A 401 here just means "no active session"; the caller
    // (AuthContext) handles it by setting user = null. Redirecting here would
    // kick unauthenticated visitors off every public/marketing page.
    return this.request<any>('/auth/me/', { noRedirectOn401: true });
  }

  // Users
  async getUsers(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/users/?${params}`);
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}/`);
  }

  async createUser(userData: any) {
    return this.request<any>('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request<any>(`/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request<any>(`/users/${id}/`, {
      method: 'DELETE',
    });
  }

  // Departments
  async getDepartments(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/departments/?${params}`);
  }

  async getDepartment(id: string) {
    return this.request<any>(`/departments/${id}/`);
  }

  async createDepartment(data: any) {
    return this.request<any>('/departments/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateDepartment(id: string, data: any) {
    return this.request<any>(`/departments/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteDepartment(id: string) {
    return this.request<any>(`/departments/${id}/`, { method: 'DELETE' });
  }

  // Buildings
  async getBuildings(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/buildings/?${params}`);
  }

  async getBuilding(id: string) {
    return this.request<any>(`/buildings/${id}/`);
  }

  async createBuilding(data: any) {
    return this.request<any>('/buildings/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateBuilding(id: string, data: any) {
    return this.request<any>(`/buildings/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteBuilding(id: string) {
    return this.request<any>(`/buildings/${id}/`, { method: 'DELETE' });
  }

  // Schools
  async getSchools(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/schools/?${params}`);
  }

  async getSchool(id: string) {
    return this.request<any>(`/schools/${id}/`);
  }

  async createSchool(data: any) {
    return this.request<any>('/schools/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateSchool(id: string, data: any) {
    return this.request<any>(`/schools/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteSchool(id: string) {
    return this.request<any>(`/schools/${id}/`, { method: 'DELETE' });
  }

  // Programs
  async getPrograms(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/programs/?${params}`);
  }

  async getProgram(id: string) {
    return this.request<any>(`/programs/${id}/`);
  }

  async createProgram(data: any) {
    return this.request<any>('/programs/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateProgram(id: string, data: any) {
    return this.request<any>(`/programs/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteProgram(id: string) {
    return this.request<any>(`/programs/${id}/`, { method: 'DELETE' });
  }

  // Courses
  async getCourses(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/courses/?${params}`);
  }

  async getCourse(id: string) {
    return this.request<any>(`/courses/${id}/`);
  }

  async createCourse(data: any) {
    return this.request<any>('/courses/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCourse(id: string, data: any) {
    return this.request<any>(`/courses/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteCourse(id: string) {
    return this.request<any>(`/courses/${id}/`, { method: 'DELETE' });
  }

  // Subjects
  async getSubjects() {
    return this.request<any>('/subjects/');
  }

  async getSubject(id: string) {
    return this.request<any>(`/subjects/${id}/`);
  }

  // Faculty
  async getFaculty(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/faculty/?${params}`);
  }

  async getFacultyMember(id: string) {
    return this.request<any>(`/faculty/${id}/`);
  }

  async createFaculty(facultyData: any) {
    return this.request<any>('/faculty/', {
      method: 'POST',
      body: JSON.stringify(facultyData),
    });
  }

  async updateFaculty(id: string, facultyData: any) {
    return this.request<any>(`/faculty/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(facultyData),
    });
  }

  async deleteFaculty(id: string) {
    return this.request<any>(`/faculty/${id}/`, {
      method: 'DELETE',
    });
  }

  // Students
  async getStudents(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/students/?${params}`);
  }

  async getStudent(id: string) {
    return this.request<any>(`/students/${id}/`);
  }

  async createStudent(studentData: any) {
    return this.request<any>('/students/', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id: string, studentData: any) {
    return this.request<any>(`/students/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id: string) {
    return this.request<any>(`/students/${id}/`, {
      method: 'DELETE',
    });
  }

  // Rooms (renamed from Classrooms)
  async getRooms(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/rooms/?${params}`);
  }

  async getRoom(id: string) {
    return this.request<any>(`/rooms/${id}/`);
  }

  async createRoom(roomData: any) {
    return this.request<any>('/rooms/', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async updateRoom(id: string, roomData: any) {
    return this.request<any>(`/rooms/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  }

  async deleteRoom(id: string) {
    return this.request<any>(`/rooms/${id}/`, {
      method: 'DELETE',
    });
  }

  // Backward compatibility aliases
  async getClassrooms(page = 1, pageSize = 25, search = '') { return this.getRooms(page, pageSize, search); }
  async getClassroom(id: string) { return this.getRoom(id); }
  async createClassroom(data: any) { return this.createRoom(data); }
  async updateClassroom(id: string, data: any) { return this.updateRoom(id, data); }
  async deleteClassroom(id: string) { return this.deleteRoom(id); }

  // Labs
  async getLabs(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/labs/?${params}`);
  }

  async getLab(id: string) {
    return this.request<any>(`/labs/${id}/`);
  }

  async createLab(labData: any) {
    return this.request<any>('/labs/', {
      method: 'POST',
      body: JSON.stringify(labData),
    });
  }

  async updateLab(id: string, labData: any) {
    return this.request<any>(`/labs/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(labData),
    });
  }

  async deleteLab(id: string) {
    return this.request<any>(`/labs/${id}/`, {
      method: 'DELETE',
    });
  }

  // Timetables
  async getTimetables(page = 1, pageSize = 25, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search })
    });
    return this.request<any>(`/timetables/?${params}`);
  }

  async getTimetable(id: string) {
    return this.request<any>(`/timetables/${id}/`);
  }

  async createTimetable(timetableData: any) {
    return this.request<any>('/timetables/', {
      method: 'POST',
      body: JSON.stringify(timetableData),
    });
  }

  async updateTimetable(id: string, timetableData: any) {
    return this.request<any>(`/timetables/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(timetableData),
    });
  }

  async deleteTimetable(id: string) {
    return this.request<any>(`/timetables/${id}/`, {
      method: 'DELETE',
    });
  }

  // Timetable Slots
  async getTimetableSlots(timetableId: string) {
    return this.request<any>(`/timetable-slots/?timetable=${timetableId}`);
  }

  // Timetable Generation
  async generateTimetable(generationData: {
    department_id: string;
    batch_id: string;
    semester: number;
    academic_year: string;
  }) {
    return this.request<any>('/generation-jobs/generate/', {
      method: 'POST',
      body: JSON.stringify(generationData),
    });
  }

  async getGenerationJobs(page = 1, pageSize = 25) {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString()
    });
    return this.request<any>(`/generation-jobs/?${params}`);
  }

  async getGenerationJob(jobId: string) {
    return this.request<any>(`/generation-jobs/${jobId}/`);
  }

  async approveGeneration(jobId: string) {
    return this.request<any>(`/generation-jobs/${jobId}/approve/`, {
      method: 'POST',
    });
  }

  async getGenerationResult(jobId: string) {
    return this.request<any>(`/generation-jobs/${jobId}/result/`);
  }

  // Get the latest approved timetable for a department/batch
  async getLatestApprovedTimetable(departmentId?: string, batchId?: string) {
    try {
      // 🔐 SECURITY: Never read role from localStorage for branching decisions.
      // The backend enforces per-role access. Students have no approved generation
      // jobs, so the fallback to getTimetables() below triggers automatically.
      const response = await this.getGenerationJobs();
      if (response.data && response.data.results) {
        // Find the latest approved job
        const approvedJobs = response.data.results.filter((job: any) => 
          job.status === 'approved' &&
          (!departmentId || job.department.department_id === departmentId) &&
          (!batchId || job.batch.batch_id === batchId)
        );
        
        if (approvedJobs.length > 0) {
          // Get the most recent one
          const latestJob = approvedJobs.sort((a: any, b: any) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0];
          
          // Get the result for this job
          return this.getGenerationResult(latestJob.job_id);
        }
      }
      // No approved generation jobs found — fall back to direct timetables.
      // This path is correct for students (who never own generation jobs) and
      // for any user whose role the server has not granted generation-job access.
      return this.getTimetables();
    } catch (error) {
      return { data: null, error: 'Failed to fetch timetable' };
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
