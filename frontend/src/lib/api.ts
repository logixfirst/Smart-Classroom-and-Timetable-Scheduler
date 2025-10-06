// API Client for Django Backend
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

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to get token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options?.headers,
        },
      });

      const data = await response.json();

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

  // Authentication
  async login(credentials: LoginCredentials) {
    return this.request<{ token: string; user: any }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    this.setToken(null);
    return { status: 200 };
  }

  async getCurrentUser() {
    return this.request<any>('/users/me/');
  }

  // Users
  async getUsers(page = 1) {
    return this.request<any>(`/users/?page=${page}`);
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
  async getDepartments() {
    return this.request<any>('/departments/');
  }

  async getDepartment(id: string) {
    return this.request<any>(`/departments/${id}/`);
  }

  // Courses
  async getCourses() {
    return this.request<any>('/courses/');
  }

  async getCourse(id: string) {
    return this.request<any>(`/courses/${id}/`);
  }

  // Subjects
  async getSubjects() {
    return this.request<any>('/subjects/');
  }

  async getSubject(id: string) {
    return this.request<any>(`/subjects/${id}/`);
  }

  // Faculty
  async getFaculty(page = 1) {
    return this.request<any>(`/faculty/?page=${page}`);
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
  async getStudents(page = 1) {
    return this.request<any>(`/students/?page=${page}`);
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

  // Batches
  async getBatches() {
    return this.request<any>('/batches/');
  }

  async getBatch(id: string) {
    return this.request<any>(`/batches/${id}/`);
  }

  // Classrooms
  async getClassrooms() {
    return this.request<any>('/classrooms/');
  }

  async getClassroom(id: string) {
    return this.request<any>(`/classrooms/${id}/`);
  }

  async createClassroom(classroomData: any) {
    return this.request<any>('/classrooms/', {
      method: 'POST',
      body: JSON.stringify(classroomData),
    });
  }

  async updateClassroom(id: string, classroomData: any) {
    return this.request<any>(`/classrooms/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(classroomData),
    });
  }

  async deleteClassroom(id: string) {
    return this.request<any>(`/classrooms/${id}/`, {
      method: 'DELETE',
    });
  }

  // Labs
  async getLabs() {
    return this.request<any>('/labs/');
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
  async getTimetables() {
    return this.request<any>('/timetables/');
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

  // Attendance
  async getAttendance(studentId?: string) {
    const query = studentId ? `?student=${studentId}` : '';
    return this.request<any>(`/attendance/${query}`);
  }

  async markAttendance(attendanceData: any) {
    return this.request<any>('/attendance/', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
